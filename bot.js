const Discord = require("discord.js");
const bot = new Discord.Client({ fetchAllMembers: true });
const config = require("./config.json");
const fs = require("fs");
const moment = require("moment");

const log = (message) => {
  console.log(`[${moment().format("DD-MM-YYYY HH:mm:ss")}] ${message}`);
};

function loadCmds () {
bot.commands = new Discord.Collection();
bot.aliases = new Discord.Collection();
bot.notes = require("./notes.json")
fs.readdir("./cmd/", (err, files) => {
  if (err) console.error(err);
  console.log(" ")
  log(`Loading a total of ${files.length} commands.`);
  files.forEach(f => {
    delete require.cache[require.resolve(`./cmd/${f}`)]
    let props = require(`./cmd/${f}`);
    log(`Loading Command: ${props.help.name}`);
    bot.commands.set(props.help.name, props);
    props.conf.aliases.forEach(alias => {
      bot.aliases.set(alias, props.help.name);
    });
  });
  console.log(" ")
});
}

loadCmds();

bot.on("message",message => {
  if (!message.content.startsWith(config.prefix)) return;
  let command = message.content.toLocaleLowerCase().split(" ")[0].slice(config.prefix.length);
  let args = message.content.split(" ").slice(1);
  let perms = bot.elevation(message);
  let cmd;

  if (bot.commands.has(command)) {
    cmd = bot.commands.get(command);
  } else if (bot.aliases.has(command)) {
    cmd = bot.commands.get(bot.aliases.get(command));
  }
  if (cmd) {
    if (perms < cmd.conf.permLevel) return;
    cmd.run(bot, message, args, perms);
  }

  if(message.author.id == config.ownerid) { 
  if(message.content === config.prefix + "reload") {
    loadCmds()
    message.channel.send(`All Commands Reloaded`)
  }} if(message.content === config.prefix + "reload" && message.author.id != config.ownerid) {
    message.react("⛔")
  }
});

bot.on("ready", () => {
  bot.user.setGame("with ${bot.users.size} users.", "https://twitch.tv/you_best")
  log(`ROOTBOT: Ready to serve ${bot.users.size} users, in ${bot.channels.size} channels of ${bot.guilds.size} servers.`);
});
bot.on("error", console.log);
bot.on("warn", console.warn);

bot.login(config.botToken);

bot.reload = function(command) {
  return new Promise((resolve, reject) => {
    try {
      delete require.cache[require.resolve(`./cmd/${command}`)];
      let cmd = require(`./cmd/${command}`);
      bot.commands.delete(command);
      bot.aliases.forEach((cmd, alias) => {
        if (cmd === command) bot.aliases.delete(alias);
      });

      bot.commands.set(command, cmd);
      cmd.conf.aliases.forEach(alias => {
        bot.aliases.set(alias, cmd.help.name);
      });
      resolve();
    } catch (e){
      reject(e);
    }
  });
};

bot.elevation = function(message) {
  let permlvl = 0;
  
  let staff_role = message.guild.roles.find("name", "Staff");
  if(staff_role && message.member.roles.has(staff_role.id)) permlvl = 1;

  let mod_role = message.guild.roles.find("name", "Moderator");
  if(mod_role && message.member.roles.has(mod_role.id)) permlvl = 2;
  
  let admin_role = message.guild.roles.find("name", "Moderator+");
  if(admin_role && message.member.roles.has(admin_role.id)) permlvl = 3;
  
  if(message.author.id === config.ownerid) permlvl = 4;
  return permlvl;
};

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {c:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));
process.on('SIGHUP', exitHandler.bind(null, {exit:true}));
//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));