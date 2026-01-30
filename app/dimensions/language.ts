export interface LanguageDefinition {
  englishName: string;
  name: string;
  isoCode: string;
  phrases: LanguagePhrases;
}

export interface LanguagePhrasesOverrides {
  nameAlreadyOnServer?: string;
  characterNameLengthOutOfRange?: string;
  areYouEvenConnected?: string;
  youAreAlreadyInthatDimension?: string;
  shiftingToDimension?: string;
  youNeedToWaitUntilConnected?: string;
  playerCount?: string;
  availableDimensions?: string;
  youEnteredTheVoid?: string;
  dimensionDisconnectedYou?: string;
  reason?: string;
  dimensionsCommandName?: string;
  specifyADimensionToTravel?: string;
  dimensionDropped?: string;
  blacklisted?: string;
  blacklistCheckError?: string;
  invalidPacketLength?: string;
  close?: string;
}

interface LanguagePhrases {
  nameAlreadyOnServer: string;
  characterNameLengthOutOfRange: string;
  areYouEvenConnected: string;
  youAreAlreadyInthatDimension: string;
  shiftingToDimension: string;
  youNeedToWaitUntilConnected: string;
  playerCount: string;
  availableDimensions: string;
  youEnteredTheVoid: string;
  dimensionDisconnectedYou: string;
  reason: string;
  dimensionsCommandName: string;
  specifyADimensionToTravel: string;
  dimensionDropped: string;
  blacklisted: string;
  blacklistCheckError: string;
  invalidPacketLength: string;
  close: string;
}

export const english: LanguageDefinition = {
  englishName: "English",
  name: "English",
  isoCode: "en",
  phrases: {
    nameAlreadyOnServer: "Someone called ${name} is already on the server.",
    characterNameLengthOutOfRange:
      "A character name must be between (inclusive) 2 to 20 characters long.",
    areYouEvenConnected: "Are you even connected?",
    youAreAlreadyInthatDimension: "You are already in that Dimension.",
    shiftingToDimension: "Shifting to the ${name} Dimension",
    youNeedToWaitUntilConnected:
      "You need to wait until you have fully connected to your current Dimension.",
    playerCount: "There are ${total} players across all Dimensions.",
    availableDimensions: "Available Dimensions: ",
    youEnteredTheVoid: "You have entered the Void. You will soon disappear.",
    dimensionDisconnectedYou: "The dimension you were in disconnected you",
    reason: "Reason: ",
    dimensionsCommandName: "dimensions",
    specifyADimensionToTravel: "Specify a [c/FF00CC:Dimension] to travel to:",
    dimensionDropped: "The dimension you were in dropped the connection.",
    blacklisted: "You are blacklisted from the server.",
    blacklistCheckError: "There was an error checking if you are blacklisted.",
    invalidPacketLength: "Client violated protocol: Invalid packet length.",
    // This is just on the assumption that in production you are not permanently
    // closing the server, but rather restarting it.
    close: "The server is being restarted. Please rejoin.",
  },
};

export const chinese: LanguageDefinition = {
  englishName: "Chinese",
  name: "汉语",
  isoCode: "zn",
  phrases: {
    nameAlreadyOnServer: "${name} 已经在服务器中",
    characterNameLengthOutOfRange: "昵称长度必须在2至20个字符之间",
    areYouEvenConnected:
      "[i:3459]CSFT[i:3459] [c/ff8080:请][c/ffda80:确][c/c8ff80:保][c/6dff80:你][c/12ff80:已][c/49ffc8:经][c/a4daed:连][c/fe80c0:接]",
    youAreAlreadyInthatDimension:
      "[i:3459]CSFT[i:3459] [c/ff8080:你][c/ffda80:已][c/c8ff80:经][c/6dff80:进][c/12ff80:入][c/49ffc8:了][c/a4daed:此][c/fe80c0:服]",
    shiftingToDimension:
      "[i:3459]CSFT[i:3459] [c/ff8080:正][c/ffff80:在][c/80ff80:传][c/00ff80:送][c/80ffff:到] ${name}",
    youNeedToWaitUntilConnected:
      "[i:3459]CSFT[i:3459] [c/ff8080:请][c/ffda80:等][c/c8ff80:待][c/6dff80:传][c/12ff80:送][c/49ffc8:.][c/a4daed:.][c/fe80c0:.]",
    playerCount: "[i:3459]CSFT[i:3459] 当前维度有 ${total} 玩家在线",
    availableDimensions:
      "[i:3459]CSFT[i:3459] [c/ff8080:可][c/ffcf80:传][c/dfff80:送][c/8fff80:的][c/40ff80:服][c/0fff8f:务][c/5fffdf:器][c/afcfe7::] ",
    youEnteredTheVoid:
      "[i:3459]CSFT[i:3459] [c/ff8080:你][c/ffaa80:已][c/ffd480:掉][c/ffff80:线][c/d4ff80:，][c/aaff80:即][c/80ff80:将][c/55ff80:被][c/2aff80:踢][c/00ff80:出][c/2affaa:服][c/55ffd4:务][c/80ffff:器][c/aad4ea:.][c/d4aad5:.][c/fe80c0:.]",
    dimensionDisconnectedYou:
      "[i:3459]CSFT[i:3459] [c/ff8080:你][c/ffb980:已][c/fff380:与][c/d0ff80:当][c/97ff80:前][c/5dff80:服][c/22ff80:务][c/17ff97:器][c/51ffd0:断][c/8bf3f9:开][c/c5b9dc:连][c/fe80c0:接]",
    reason: "原因:",
    dimensionsCommandName: "服务器",
    specifyADimensionToTravel:
      "[i:3459]CSFT[i:3459] [c/ff8080:请][c/ffda80:选][c/c8ff80:择][c/6dff80:需][c/12ff80:要][c/49ffc8:传][c/a4daed:送][c/fe80c0:的][c/FF00CC:分区]：",
    dimensionDropped:
      "[i:3459]CSFT[i:3459] [c/ff8080:服][c/ffc680:务][c/f0ff80:器][c/aaff80:暂][c/63ff80:时][c/1cff80:关][c/2affaa:闭][c/71fff0:.][c/b8c6e3:.][c/fe80c0:.]",
    blacklisted: "您已被服务器列入黑名单。",
    blacklistCheckError: "检查您是否被列入黑名单时出现错误。",
    invalidPacketLength:
      "[c/ff8080:客][c/ffaa80:户][c/ffd480:端][c/ffff80:违][c/d4ff80:反][c/aaff80:协][c/80ff80:议][c/55ff80:：][c/2aff80:数][c/00ff80:据][c/2affaa:包][c/55ffd4:长][c/80ffff:度][c/aad4ea:无][c/d4aad5:效][c/fe80c0:。]",
    close: "服务器正在重新启动,请重新加入。",
  },
};
