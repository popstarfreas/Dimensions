# Dimension Packet Update Types
## [0] Real IP Address
Dimensions sends this to a Terraria Server to update the client's IP address from the IP of the machine Dimensions is running on to the real IP of the client.
| Info        | Size | Datatype |
| ----------- | ---- | -------- |
| Type        | 2    | Int16    |
| IP          | ?    | String   |

## [1] Gamemodes Join Mode
Gamemodes uses this to specify what mode the user has joined for.
| Info        | Size | Datatype |
| ----------- | ---- | -------- |
| Type        | 2    | Int16    |
| Join Mode   | ?    | String   |

## [2] Switch Server
Terraria Servers use this to tell Dimensions to switch the clients Dimension
| Info           | Size | Datatype |
| -------------- | ---- | -------- |
| Type           | 2    | Int16    |
| Dimension Name | ?    | String   |

## [3] Switch Server Manual
| Info           | Size | Datatype |
| -------------- | ---- | -------- |
| Type           | 2    | Int16    |
| Server IP      | ?    | String   |
| Server Port    | ?    | UInt16   |
Terraria Servers use this to tell Dimension to switch the client to a specific ip/port that is not in the Dimensions config.