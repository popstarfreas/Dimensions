interface ServerDetails {
    clientCount: number;
    disabled: boolean;
    disabledTimeout: NodeJS.Timer | null;
    failedConnAttempts: number;
}

export default ServerDetails;