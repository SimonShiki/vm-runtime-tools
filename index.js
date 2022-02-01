const { Extension, type, api } = require('clipcc-extension');

class Main extends Extension {
    onInit() {
        console.log('Initializing VMRuntimeTools extension!');
        const sequencer = api.getVmInstance().runtime.sequencer;
        api.addCategory({
            categoryId: 'sinangentoo.vmruntimetools',
            messageId: 'sinangentoo.vmruntimetools.category',
            color: '#00acc1',
        });
        api.addBlock({
            opcode: 'sinangentoo.vmruntimetools.enableWarpInThisThread',
            messageId: 'sinangentoo.vmruntimetools.enableWarpInThisThread',
            categoryId: 'sinangentoo.vmruntimetools',
            type: type.BlockType.COMMAND,
            func: this.enableWarpInThread,
        })
    }

    enableWarpInThread(args, util) {
        console.log(util);
    }

    onUninit () {
        api.removeCategory('sinangentoo.vmruntimetools');
    }
}

module.exports = Main;
