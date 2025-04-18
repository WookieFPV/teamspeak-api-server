export type TsUser = {
    clid: string
    cid: string
    clientDatabaseId: string
    clientNickname: string
    clientType: number
    clientAway: boolean
    clientFlagTalking: boolean
    clientInputMuted: boolean
    clientOutputMuted: boolean
    clientInputHardware: boolean
    clientOutputHardware: boolean
    clientTalkPower: number
    clientIsTalker: boolean
    clientIsPrioritySpeaker: number
    clientIsRecording: boolean
    clientIsChannelCommander: boolean
    clientUniqueIdentifier: string
    clientServergroups: Array<string>
    clientChannelGroupId: string
    clientChannelGroupInheritedChannelId: string
    clientVersion: string
    clientPlatform: string
    clientIdleTime: number
    clientCreated: number
    clientLastconnected: number
    clientIconId: string
    clientCountry: string
    connectionClientIp: string
    _namespace: string
}

export type TsChannel = {
    cid: string
    pid: string
    channelOrder: number
    channelName: string
    channelFlagDefault: boolean
    channelFlagPassword: boolean
    channelFlagPermanent: boolean
    channelFlagSemiPermanent: boolean
    channelCodec: number
    channelCodecQuality: number
    channelNeededTalkPower: number
    channelIconId: string
    secondsEmpty: number
    totalClientsFamily: number
    channelMaxclients: number
    channelMaxfamilyclients: number
    totalClients: number
    channelNeededSubscribePower: number
    _namespace: string
}
