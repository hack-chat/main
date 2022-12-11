export async function run(core, server, socket, payload) {
  //nothing
  return true
}
// module hook functions
export function initHooks(server) {
  server.registerHook('in', 'chat', this.fastcmd.bind(this), 253);
}

export function isArray(myArray) {
  return myArray.constructor.toString().indexOf("Array") > -1;
}

export function fastcmd({core, server, socket, payload}) {
  if (typeof payload.text !== 'string') {
    return false;
  }
  const cmdlist = payload.text.split(' ')
  
  //检查是否以“/”开头
  if (!cmdlist[0].startsWith('/')){
    return payload
  }

  //是否转义
  if (cmdlist[0].startsWith('//')){
    return payload
  }

  const cmdName = cmdlist[0].slice(1);    //获取命令名称
  const command = core.commands.get(cmdName)    //找命令模块

  if (!command){    //如果找不到
    return payload
  }
  
  if (!command.info.fastcmd){
    return payload    //如果模块没有启用fastcmd支持
  }
  //声明变量
  var i = 0
  var cut = 1
  var fakePayload = {    //假的数据包
    cmd:cmdName,
  }

  for (i in command.info.fastcmd){    //构建假的数据包
    if (command.info.fastcmd[i].len === 0){    //如果要求的长度为0，则代表通吃所有内容
      var temp = cmdlist.slice(cut,cmdlist.length)
      if (temp.length === 0){
        continue
      }
      fakePayload[command.info.fastcmd[i].name] = temp.join(' ')    //给你吧
      break    //没用了，结束循环吧
    }
    var temp = cmdlist.slice(cut,cut+command.info.fastcmd[i].len)
    if (temp.length === 0){
      continue
    }
    fakePayload[command.info.fastcmd[i].name] = temp.join(' ')    //截取数组，然后join一下
    cut += command.info.fastcmd[i].len
  }
  server.handleData(socket,JSON.stringify(fakePayload))
  return false
}


export const info = {
  name: 'fastcmd',
  category: 'internal',
  description: 'This module allows you to quickly execute commands by sending information similar to the `/command parameter`.',
  usage: `
    idk`,
};
