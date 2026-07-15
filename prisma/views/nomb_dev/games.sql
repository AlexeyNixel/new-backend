SELECT
  `g_view`.`id` AS `id`,
  `g_view`.`name` AS `name`,
  `g_view`.`player_min` AS `player_min`,
  `g_view`.`player_max` AS `player_max`,
  `g_view`.`player_age` AS `player_age`,
  `g_view`.`short_description` AS `short_description`,
  `g_view`.`full_description` AS `full_description`,
  `g_view`.`cover_file` AS `cover_file`,
  `g_view`.`rules_file` AS `rules_file`,
  `g_view`.`genres` AS `genres`,
  `g_view`.`game_duration` AS `game_duration`,
  `g_view`.`game_year` AS `game_year`,
  `g_view`.`status` AS `status`,
  `g_view`.`place` AS `place`,
  `g_view`.`comment` AS `comment`,
  `g_view`.`status_desc` AS `status_desc`
FROM
  `nomb_games`.`g_view`