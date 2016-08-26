import RoutingInformation from './routinginformation';
interface ChangeServerOptions {
    preventSpawnOnJoin?: boolean;
    routingInformation: RoutingInformation;
}

export default ChangeServerOptions;