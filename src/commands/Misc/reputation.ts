import type { UserRepository } from '#lib/database';
import { LanguageKeys } from '#lib/i18n/languageKeys';
import { SkyraCommand } from '#lib/structures';
import type { GuildMessage } from '#lib/types';
import { Schedules } from '#lib/types/Enums';
import { ApplyOptions } from '@sapphire/decorators';
import { Args, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import { send } from '@sapphire/plugin-editable-commands';
import { Time } from '@sapphire/time-utilities';
import type { User } from 'discord.js';
import type { TFunction } from 'i18next';

const flags = ['remind', 'reminder', 'remindme'];

@ApplyOptions<SkyraCommand.Options>({
	aliases: ['rep'],
	description: LanguageKeys.Commands.Social.ReputationDescription,
	detailedDescription: LanguageKeys.Commands.Social.ReputationExtended,
	flags,
	runIn: [CommandOptionsRunTypeEnum.GuildAny]
})
export class UserCommand extends SkyraCommand {
	public async messageRun(message: GuildMessage, args: SkyraCommand.Args) {
		const check = await args.pick(UserCommand.check).catch(() => false);
		if (check) return this.check(message, args);

		const user = args.finished ? null : await this.getUser(args);
		const settings = await this.downloadSettings(message.author.id, user ? user.id : null);

		const date = new Date();
		const now = date.getTime();
		const timeReputation = settings.author.cooldowns.reputation?.getTime();
		if (timeReputation && timeReputation + Time.Day > now) {
			const content = args.t(LanguageKeys.Commands.Social.ReputationTime, { remaining: timeReputation + Time.Day - now });
			return send(message, content);
		}

		if (!user) {
			const content = args.t(LanguageKeys.Commands.Social.ReputationUsable);
			return send(message, content);
		}
		if (user.id === message.author.id) this.error(LanguageKeys.Commands.Social.ReputationSelf);

		await settings.users.manager.transaction(async (em) => {
			++settings.target!.reputations;
			settings.author.cooldowns.reputation = date;
			await em.save([settings.target!, settings.author]);
		});

		if (args.getFlags(...flags)) {
			await this.container.schedule.add(Schedules.Reminder, date.getTime() + Time.Day, {
				data: {
					content: args.t(LanguageKeys.Commands.Social.ReputationAvailable),
					user: message.author.id
				}
			});
		}

		const content = args.t(LanguageKeys.Commands.Social.ReputationGive, { user: user.toString() });
		return send(message, content);
	}

	private async check(message: GuildMessage, args: SkyraCommand.Args) {
		const user = args.finished ? message.author : await this.getUser(args);
		const settings = await this.downloadSettings(message.author.id, user.id);

		const content = this.handleCheck(args.t, user, settings);
		return send(message, content);
	}

	private handleCheck(t: TFunction, user: User, settings: Settings) {
		if (settings.target) {
			const reputationPoints = t(LanguageKeys.Commands.Social.Reputation, { count: settings.target.reputations });
			return t(LanguageKeys.Commands.Social.Reputations, { user: user!.username, points: reputationPoints });
		}

		return t(LanguageKeys.Commands.Social.ReputationsSelf, { points: settings.author.reputations });
	}

	private async downloadSettings(authorId: string, targetId: string | null): Promise<Settings> {
		const { users } = this.container.db;
		return {
			users,
			author: await users.ensureProfileAndCooldowns(authorId),
			target: targetId && targetId !== authorId ? await users.ensureProfile(targetId) : null
		};
	}

	private async getUser(args: SkyraCommand.Args) {
		const user = await args.pick('userName');
		if (user.bot) this.error(LanguageKeys.Commands.Social.ReputationsBots);
		return user;
	}

	private static check = Args.make<boolean>((parameter, { argument }) => {
		if (parameter.toLowerCase() === 'check') return Args.ok(true);
		return Args.error({ argument, parameter });
	});
}

interface Settings {
	users: UserRepository;
	author: UserRepository.UserEntityWithProfileAndCooldowns;
	target: UserRepository.UserEntityWithProfile | null;
}
