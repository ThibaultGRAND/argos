-- Recherche plein texte des messages (F03). Drizzle ne modélise pas FTS5 : migration écrite à la main.
-- Contenu externe : le texte reste dans `messages`, l'index ne le duplique pas.
-- `remove_diacritics 2` : recherche insensible à la casse et aux accents.
CREATE VIRTUAL TABLE `messages_fts` USING fts5(
	`text`,
	content='messages',
	content_rowid='id',
	tokenize='unicode61 remove_diacritics 2'
);
--> statement-breakpoint
CREATE TRIGGER `messages_fts_after_insert` AFTER INSERT ON `messages` BEGIN
	INSERT INTO `messages_fts`(rowid, `text`) VALUES (new.`id`, new.`text`);
END;
--> statement-breakpoint
CREATE TRIGGER `messages_fts_after_delete` AFTER DELETE ON `messages` BEGIN
	INSERT INTO `messages_fts`(`messages_fts`, rowid, `text`) VALUES ('delete', old.`id`, old.`text`);
END;
--> statement-breakpoint
CREATE TRIGGER `messages_fts_after_update` AFTER UPDATE OF `text` ON `messages` BEGIN
	INSERT INTO `messages_fts`(`messages_fts`, rowid, `text`) VALUES ('delete', old.`id`, old.`text`);
	INSERT INTO `messages_fts`(rowid, `text`) VALUES (new.`id`, new.`text`);
END;
--> statement-breakpoint
-- Indexe les messages déjà importés.
INSERT INTO `messages_fts`(`messages_fts`) VALUES ('rebuild');
