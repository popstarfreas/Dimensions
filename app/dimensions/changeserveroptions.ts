import RoutingInformation from './routinginformation.js';

interface ChangeServerOptions {
    preventSpawnOnJoin?: boolean;
    extraJoinInformation?: string;
    routingInformation?: RoutingInformation;
    skipClearingReconnect?: boolean;
}

export default ChangeServerOptions;
