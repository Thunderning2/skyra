import { LanguageKeys } from '#lib/i18n/languageKeys';
import { SkyraCommand } from '#lib/structures';
import { assetsFolder } from '#utils/constants';
import { fetchAvatar, radians } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { send } from '@sapphire/plugin-editable-commands';
import { Canvas, Image, resolveImage } from 'canvas-constructor/skia';
import { PermissionFlagsBits } from 'discord-api-types/v9';
import type { Message, User } from 'discord.js';
import { join } from 'node:path';

const imageCoordinates = [
	[
		// Tony
		{ center: [211, 53], radius: 18, rotation: radians(-9.78), flip: true },
		{ center: [136, 237], radius: 53, rotation: radians(24.27), flip: true },
		{ center: [130, 385], radius: 34, rotation: radians(17.35), flip: true }
	],
	[
		// Cpt America
		{ center: [326, 67], radius: 50, rotation: radians(-32.47), flip: true },
		{ center: [351, 229], radius: 43, rotation: radians(-8.53), flip: false },
		{ center: [351, 390], radius: 40, rotation: radians(-9.21), flip: false }
	]
] as const;

@ApplyOptions<SkyraCommand.Options>({
	aliases: ['pants'],
	description: LanguageKeys.Commands.Fun.HowToFlirtDescription,
	detailedDescription: LanguageKeys.Commands.Fun.HowToFlirtExtended,
	requiredClientPermissions: [PermissionFlagsBits.AttachFiles]
})
export class UserCommand extends SkyraCommand {
	private kTemplate: Image = null!;

	public async messageRun(message: Message, args: SkyraCommand.Args) {
		const user = await args.pick('userName');
		const attachment = await this.generate(message, user);
		return send(message, { files: [{ attachment, name: 'HowToFlirt.png' }] });
	}

	public async onLoad() {
		this.kTemplate = await resolveImage(join(assetsFolder, '/images/memes/howtoflirt.png'));
	}

	private async generate(message: Message, user: User) {
		if (user.id === message.author.id) user = this.container.client.user!;

		/* Get the buffers from both profile avatars */
		const images = await Promise.all([fetchAvatar(message.author, 128), fetchAvatar(user, 128)]);

		/* Initialize Canvas */
		return new Canvas(500, 500)
			.printImage(this.kTemplate, 0, 0, 500, 500)
			.process((canvas) => {
				for (const index of [0, 1]) {
					const image = images[index];
					const coordinates = imageCoordinates[index];

					for (const { center, rotation, radius, flip } of coordinates) {
						canvas
							.setTransform(flip ? -1 : 1, 0, 0, 1, center[0], center[1])
							.rotate(flip ? -rotation : rotation)
							.printCircularImage(image, 0, 0, radius);
					}
				}
			})
			.png();
	}
}
