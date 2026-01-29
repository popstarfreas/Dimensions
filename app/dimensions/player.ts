import Item from './item.js';
import Client from './client.js';
import Color from './color.js';
import { PlayerHealthPacket, PlayerInfoPacket, PlayerInventorySlotPacket, PlayerManaPacket } from 'terraria-packet';
type Difficulty = PlayerInfoPacket.difficulty
type Mode = PlayerInfoPacket.mode

class Player {
	public id: number;
	public name: string;
	public inventory: (Item | undefined)[];
	public life: number;
	public mana: number;
	public allowedNameChange: boolean;
	public allowedCharacterChange: boolean;
	public allowedLifeChange: boolean;
	public allowedManaChange: boolean;
	public position: { x: number, y: number } = {
		x: 0,
		y: 0
	};

	// Visuals
	public skinVariant: number = 0;
	public hair: number = 0;
	public hairDye: number = 0;
	public hideVisuals: number = 0;
	public hideVisuals2: number = 0;
	public hideMisc: number = 0;
	public hairColor: Color = { R: 0, G: 0, B: 0 };
	public skinColor: Color = { R: 0, G: 0, B: 0 };
	public eyeColor: Color = { R: 0, G: 0, B: 0 };
	public shirtColor: Color = { R: 0, G: 0, B: 0 };
	public underShirtColor: Color = { R: 0, G: 0, B: 0 };
	public pantsColor: Color = { R: 0, G: 0, B: 0 };
	public shoeColor: Color = { R: 0, G: 0, B: 0 };
	public extraAccessory: boolean = false;
	public usingBiomeTorches: boolean = false;
	public unlockedBiomeTorches: boolean = false;
	public happyFunTorchTime: boolean = false;
	public unlockedSuperCart: boolean = false;
	public enabledSuperCart: boolean = false;
	public usedAegisCrystal: boolean = false;
	public usedAegisFruit: boolean = false;
	public usedArcaneCrystal: boolean = false;
	public usedGalaxyPearl: boolean = false;
	public usedGummyWorm: boolean = false;
	public usedAmbrosia: boolean = false;
	public ateArtisanBread: boolean = false;
	public voiceVariant: number = 0;
	public voicePitchOffset: number = 0;
	private client: Client | null;

	public difficulty: Difficulty = "Softcore";
	public mode: Mode = "Classic";

	constructor(client: Client | null) {
		this.client = client;
		this.id = 0;
		this.name = "";
		this.life = 100;
		this.mana = 20;
		this.allowedNameChange = false;
		this.allowedCharacterChange = false;
		this.allowedLifeChange = false;
		this.allowedManaChange = false;

		// Inventory of Client - only used for SSC -> to Non-SSC switching
		this.inventory = [];
	}

	public setItem(item: Item): void {
		if (this.client === null) {
			return;
		}

		let playerInventorySlot = PlayerInventorySlotPacket.toBuffer({
			playerId: this.id,
			slot: item.slot,
			stack: item.stack,
			prefix: item.prefix,
			itemType: item.netID,
			favorited: false,
			blocked: false
		})

		switch (playerInventorySlot.TAG) {
			case "Ok":
				this.client.sendDirect(playerInventorySlot._0);
				break;
			case "Error":
				this.client.logging.error(`Error creating player inventory slot packet: ${playerInventorySlot._0}`);
				break;
		}
	}

	public restoreSavedMaxHealth(): void {
		if (this.client === null) {
			return;
		}

		let playerLife = PlayerHealthPacket.toBuffer({
			playerId: this.id,
			maxHealth: this.life,
			health: this.life
		})

		switch (playerLife.TAG) {
			case "Ok":
				this.client.sendDirect(playerLife._0);
				break;
			case "Error":
				this.client.logging.error(`Error creating player health packet: ${playerLife._0}`);
				break;
		}
	}

	/**
	 * @deprecated Use restoreSavedMaxHealth instead
	 */
	public setLife(): void {
		this.restoreSavedMaxHealth();
	}

	public restoreSavedMaxMana(): void {
		if (this.client === null) {
			return;
		}

		let playerMana = PlayerManaPacket.toBuffer({
			playerId: this.id,
			maxMana: this.mana,
			mana: this.mana
		})

		switch (playerMana.TAG) {
			case "Ok":
				this.client.sendDirect(playerMana._0);
				break;
			case "Error":
				this.client.logging.error(`Error creating player mana packet: ${playerMana._0}`);
				break;
		}
	}

	/**
	 * @deprecated Use restoreSavedMaxMana instead
	 */
	public setMana(): void {
		this.restoreSavedMaxMana();
	}

	public setVisuals(): void {
		if (this.client === null) {
			return;
		}

		const playerInfo: PlayerInfoPacket.t = {
			playerId: this.id,
			skinVariant: this.skinVariant,
			hair: this.hair,
			name: this.name,
			hairDye: this.hairDye,
			hideVisuals: this.hideVisuals,
			hideVisuals2: this.hideVisuals2,
			hideMisc: this.hideMisc,
			hairColor: this.hairColor,
			skinColor: this.skinColor,
			eyeColor: this.eyeColor,
			shirtColor: this.shirtColor,
			underShirtColor: this.underShirtColor,
			pantsColor: this.pantsColor,
			shoeColor: this.shoeColor,
			difficulty: this.difficulty,
			mode: this.mode,
			extraAccessory: this.extraAccessory,
			usingBiomeTorches: this.usingBiomeTorches,
			unlockedBiomeTorches: this.unlockedBiomeTorches,
			happyFunTorchTime: this.happyFunTorchTime,
			unlockedSuperCart: this.unlockedSuperCart,
			enabledSuperCart: this.enabledSuperCart,
			usedAegisCrystal: this.usedAegisCrystal,
			usedAegisFruit: this.usedAegisFruit,
			usedArcaneCrystal: this.usedArcaneCrystal,
			usedGalaxyPearl: this.usedGalaxyPearl,
			usedGummyWorm: this.usedGummyWorm,
			usedAmbrosia: this.usedAmbrosia,
			ateArtisanBread: this.ateArtisanBread,
			voiceVariant: this.voiceVariant,
			voicePitchOffset: this.voicePitchOffset
		};
		const playerInfoPacket = PlayerInfoPacket.toBuffer(playerInfo);
		if (playerInfoPacket.TAG === "Ok") {
			this.client.sendDirect(playerInfoPacket._0);
		}
	}
}

export default Player;
