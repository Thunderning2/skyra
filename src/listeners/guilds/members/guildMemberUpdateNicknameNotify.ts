import { GuildSettings, readSettings } from '#lib/database';
import { LanguageKeys } from '#lib/i18n/languageKeys';
import { Events } from '#lib/types/Enums';
import { Colors } from '#utils/constants';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { GuildMember, MessageEmbed } from 'discord.js';
import type { TFunction } from 'i18next';

@ApplyOptions<ListenerOptions>({ event: Events.GuildMemberUpdate })
export class UserListener extends Listener {
	public async run(previous: GuildMember, next: GuildMember) {
		const key = GuildSettings.Channels.Logs.MemberNickNameUpdate;
		const [logChannelId, t] = await readSettings(next, (settings) => [settings[key], settings.getLanguage()]);
		if (isNullish(logChannelId)) return;

		// Send the Nickname log
		const prevNickname = previous.nickname;
		const nextNickname = next.nickname;
		const { user } = next;
		if (prevNickname !== nextNickname) {
			this.container.client.emit(Events.GuildMessageLog, next.guild, logChannelId, key, () =>
				new MessageEmbed()
					.setColor(Colors.Yellow)
					.setAuthor({ name: `${user.tag} (${user.id})`, iconURL: user.displayAvatarURL({ size: 128, format: 'png', dynamic: true }) })
					.setDescription(this.getNameDescription(t, prevNickname, nextNickname))
					.setFooter({ text: t(LanguageKeys.Events.Guilds.Members.NicknameUpdate) })
					.setTimestamp()
			);
		}
	}

	private getNameDescription(t: TFunction, previousName: string | null, nextName: string | null) {
		return [
			t(
				previousName === null
					? LanguageKeys.Events.Guilds.Members.NameUpdatePreviousWasNotSet
					: LanguageKeys.Events.Guilds.Members.NameUpdatePreviousWasSet,
				{
					previousName
				}
			),
			t(
				nextName === null
					? LanguageKeys.Events.Guilds.Members.NameUpdateNextWasNotSet
					: LanguageKeys.Events.Guilds.Members.NameUpdateNextWasSet,
				{ nextName }
			)
		].join('\n');
	}
}
