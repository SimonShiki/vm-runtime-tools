const { Extension, type, api } = require('clipcc-extension');
const sequencer = api.getVmInstance().runtime.sequencer;

class Main extends Extension {
    constructor () {
        super();
        //this.warpTime = 500;
        this.workTime = 0.75;
    }

    onInit() {
        this.inject();
        console.log('Initializing VMRuntimeTools extension...');
        api.addCategory({
            categoryId: 'sinangentoo.vmruntimetools',
            messageId: 'sinangentoo.vmruntimetools.category',
            color: '#00acc1',
        });
        api.addBlock({
            opcode: 'sinangentoo.vmruntimetools.setWarpTime',
            messageId: 'sinangentoo.vmruntimetools.setWarpTime',
            categoryId: 'sinangentoo.vmruntimetools',
            type: type.BlockType.COMMAND,
            param: {
                WARP_TIME: {
                    type: type.ParameterType.NUMBER,
                    default: 500
                }
            },
            function: args => this.warpTime = args.WARP_TIME,
        });
        api.addBlock({
            opcode: 'sinangentoo.vmruntimetools.setWorkTime',
            messageId: 'sinangentoo.vmruntimetools.setWorkTime',
            categoryId: 'sinangentoo.vmruntimetools',
            type: type.BlockType.COMMAND,
            param: {
                WORK_TIME: {
                    type: type.ParameterType.NUMBER,
                    default: 0.75
                }
            },
            function: args => this.workTime = args.WORK_TIME,
        });
    }

    inject () {
        const _this = this;
        //const _stepThreads = Object.getPrototypeOf(sequencer).stepThreads;
        //console.log(_stepThreads);
        sequencer.stepThreads = function () {
            // Work time is 75% of the thread stepping interval.
            const WORK_TIME = _this.workTime * this.runtime.currentStepTime;
            // For compatibility with Scatch 2, update the millisecond clock
            // on the Runtime once per step (see Interpreter.as in Scratch 2
            // for original use of `currentMSecs`)
            this.runtime.updateCurrentMSecs();
            // Start counting toward WORK_TIME.
            this.timer.start();
            // Count of active threads.
            let numActiveThreads = Infinity;
            // Whether `stepThreads` has run through a full single tick.
            let ranFirstTick = false;
            const doneThreads = [];
            // Conditions for continuing to stepping threads:
            // 1. We must have threads in the list, and some must be active.
            // 2. Time elapsed must be less than WORK_TIME.
            // 3. Either turbo mode, or no redraw has been requested by a primitive.
            while (this.runtime.threads.length > 0 &&
                numActiveThreads > 0 &&
                this.timer.timeElapsed() < WORK_TIME &&
                (this.runtime.turboMode || !this.runtime.redrawRequested)) {
                if (this.runtime.profiler !== null) {
                    if (stepThreadsInnerProfilerId === -1) {
                        stepThreadsInnerProfilerId = this.runtime.profiler.idByName(stepThreadsInnerProfilerFrame);
                    }
                    this.runtime.profiler.start(stepThreadsInnerProfilerId);
                }

                numActiveThreads = 0;
                let stoppedThread = false;
                // Attempt to run each thread one time.
                const threads = this.runtime.threads;
                for (let i = 0; i < threads.length; i++) {
                    const activeThread = this.activeThread = threads[i];
                    // Check if the thread is done so it is not executed.
                    if (activeThread.stack.length === 0 ||
                        activeThread.status === 4) {
                        // Finished with this thread.
                        stoppedThread = true;
                        continue;
                    }
                    if (activeThread.status === 3 &&
                        !ranFirstTick) {
                        // Clear single-tick yield from the last call of `stepThreads`.
                        activeThread.status = 0;
                    }
                    if (activeThread.status === 0 ||
                        activeThread.status === 2) {
                        // Normal-mode thread: step.
                        if (this.runtime.profiler !== null) {
                            if (stepThreadProfilerId === -1) {
                                stepThreadProfilerId = this.runtime.profiler.idByName(stepThreadProfilerFrame);
                            }

                            // Increment the number of times stepThread is called.
                            this.runtime.profiler.increment(stepThreadProfilerId);
                        }
                        this.stepThread(activeThread);
                        activeThread.warpTimer = null;
                        if (activeThread.isKilled) {
                            i--; // if the thread is removed from the list (killed), do not increase index
                        }
                    }
                    if (activeThread.status === 0) {
                        numActiveThreads++;
                    }
                    // Check if the thread completed while it just stepped to make
                    // sure we remove it before the next iteration of all threads.
                    if (activeThread.stack.length === 0 ||
                        activeThread.status === 4) {
                        // Finished with this thread.
                        stoppedThread = true;
                    }
                }
                // We successfully ticked once. Prevents running STATUS_YIELD_TICK
                // threads on the next tick.
                ranFirstTick = true;

                if (this.runtime.profiler !== null) {
                    this.runtime.profiler.stop();
                }

                // Filter inactive threads from `this.runtime.threads`.
                if (stoppedThread) {
                    let nextActiveThread = 0;
                    for (let i = 0; i < this.runtime.threads.length; i++) {
                        const thread = this.runtime.threads[i];
                        if (thread.stack.length !== 0 &&
                            thread.status !== 4) {
                            this.runtime.threads[nextActiveThread] = thread;
                            nextActiveThread++;
                        } else {
                            doneThreads.push(thread);
                        }
                    }
                    this.runtime.threads.length = nextActiveThread;
                }
            }

            this.activeThread = null;

            return doneThreads;
        }

        console.log('Injected!');
    }

    onUninit () {
        api.removeCategory('sinangentoo.vmruntimetools');
    }
}

module.exports = Main;
