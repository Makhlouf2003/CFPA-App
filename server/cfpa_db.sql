-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1
-- Généré le : mar. 30 sep. 2025 à 17:58
-- Version du serveur : 10.4.32-MariaDB
-- Version de PHP : 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `cfpa_db`
--

-- --------------------------------------------------------

--
-- Structure de la table `cours`
--

CREATE TABLE `cours` (
  `id` int(11) NOT NULL,
  `moduleId` int(11) NOT NULL,
  `enseignantId` int(11) NOT NULL,
  `titre` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `fichier_url` varchar(255) DEFAULT NULL,
  `fichier_public_id` varchar(255) DEFAULT NULL,
  `type_fichier` varchar(50) DEFAULT NULL,
  `informations_supplementaires` text DEFAULT NULL,
  `cree_a` datetime NOT NULL DEFAULT current_timestamp(),
  `mis_a_jour_a` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `cours`
--

INSERT INTO `cours` (`id`, `moduleId`, `enseignantId`, `titre`, `description`, `fichier_url`, `fichier_public_id`, `type_fichier`, `informations_supplementaires`, `cree_a`, `mis_a_jour_a`) VALUES
(1, 1, 1, 'Chapitre 01', 'Introduction', NULL, NULL, NULL, NULL, '2025-09-25 14:39:00', '2025-09-25 14:39:00'),
(2, 1, 1, 'Chapitre 02', 'Les relations des bases', NULL, NULL, NULL, NULL, '2025-09-25 14:41:02', '2025-09-25 14:41:02'),
(3, 2, 1, 'Chapitre 01', 'JAVA', NULL, NULL, NULL, NULL, '2025-09-25 14:41:31', '2025-09-25 14:41:31'),
(4, 3, 2, 'Chapitre 01', 'Mécanique', NULL, NULL, NULL, NULL, '2025-09-25 14:44:07', '2025-09-25 14:44:07'),
(5, 4, 2, 'Chapitre 01', 'Introduction', NULL, NULL, NULL, NULL, '2025-09-25 14:45:11', '2025-09-25 14:45:11'),
(6, 5, 3, 'Chapitre 01', 'Les verbes', NULL, NULL, NULL, NULL, '2025-09-25 14:50:17', '2025-09-25 14:50:17'),
(7, 6, 3, 'Chapitre 01', 'Les nomes', NULL, NULL, NULL, NULL, '2025-09-25 14:50:47', '2025-09-25 14:50:47'),
(8, 1, 1, 'Chapitre 03', 'SQLite', NULL, NULL, NULL, NULL, '2025-09-25 18:19:13', '2025-09-25 18:19:13'),
(9, 1, 1, 'Chapitre 04', '', NULL, NULL, NULL, NULL, '2025-09-30 07:20:01', '2025-09-30 07:20:01');

-- --------------------------------------------------------

--
-- Structure de la table `cours_fichiers`
--

CREATE TABLE `cours_fichiers` (
  `id` int(11) NOT NULL,
  `coursId` int(11) NOT NULL,
  `fichier_url` varchar(255) DEFAULT NULL,
  `fichier_public_id` varchar(255) DEFAULT NULL,
  `type_fichier` varchar(50) DEFAULT NULL,
  `nom_fichier` varchar(255) DEFAULT NULL,
  `cree_a` datetime NOT NULL DEFAULT current_timestamp(),
  `mis_a_jour_a` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `cours_fichiers`
--

INSERT INTO `cours_fichiers` (`id`, `coursId`, `fichier_url`, `fichier_public_id`, `type_fichier`, `nom_fichier`, `cree_a`, `mis_a_jour_a`) VALUES
(1, 1, 'https://res.cloudinary.com/dwngcdmmc/image/upload/v1758807555/cours/pgei448hgb1faivyurjx.pdf', 'cours/pgei448hgb1faivyurjx', 'application/pdf', 'Rapport-de-mission2.pdf', '2025-09-25 14:39:16', '2025-09-25 14:39:16'),
(2, 1, 'https://res.cloudinary.com/dwngcdmmc/image/upload/v1758807585/cours/lexw1uxqz4sh9yrrpss4.pdf', 'cours/lexw1uxqz4sh9yrrpss4', 'application/pdf', 'git-github-reference.pdf', '2025-09-25 14:39:47', '2025-09-25 14:39:47'),
(3, 1, 'https://res.cloudinary.com/dwngcdmmc/image/upload/v1758807608/cours/smj96gsdr4xrm15b8rj8.png', 'cours/smj96gsdr4xrm15b8rj8', 'image/png', 'Programme.png', '2025-09-25 14:40:09', '2025-09-25 14:40:09'),
(4, 2, 'https://res.cloudinary.com/dwngcdmmc/image/upload/v1758807669/cours/l2iddtssjoeyfhoksoip.png', 'cours/l2iddtssjoeyfhoksoip', 'image/png', 'Programme.png', '2025-09-25 14:41:11', '2025-09-25 14:41:11'),
(5, 3, 'https://res.cloudinary.com/dwngcdmmc/image/upload/v1758807715/cours/cbzhd65pac8sylrzjrl3.pdf', 'cours/cbzhd65pac8sylrzjrl3', 'application/pdf', 'Rapport-de-mission2.pdf', '2025-09-25 14:41:56', '2025-09-25 14:41:56'),
(6, 4, 'https://res.cloudinary.com/dwngcdmmc/image/upload/v1758807878/cours/javex2wlqgedvpxlfk3d.pdf', 'cours/javex2wlqgedvpxlfk3d', 'application/pdf', 'git-github-reference.pdf', '2025-09-25 14:44:39', '2025-09-25 14:44:39'),
(7, 4, 'https://res.cloudinary.com/dwngcdmmc/image/upload/v1758807881/cours/ki9llaqgphm4xtjkmlhf.pdf', 'cours/ki9llaqgphm4xtjkmlhf', 'application/pdf', 'Rapport-de-mission2.pdf', '2025-09-25 14:44:43', '2025-09-25 14:44:43'),
(8, 5, 'https://res.cloudinary.com/dwngcdmmc/image/upload/v1758808102/cours/a0q5jdiprits9sqtaghr.png', 'cours/a0q5jdiprits9sqtaghr', 'image/png', 'Programme.png', '2025-09-25 14:48:24', '2025-09-25 14:48:24'),
(9, 6, 'https://res.cloudinary.com/dwngcdmmc/image/upload/v1758808224/cours/uodwziv2n1mydggxxyjq.png', 'cours/uodwziv2n1mydggxxyjq', 'image/png', 'logo.png', '2025-09-25 14:50:26', '2025-09-25 14:50:26'),
(10, 7, 'https://res.cloudinary.com/dwngcdmmc/image/upload/v1758808252/cours/y6r0pz3gmz2cj7slotq0.png', 'cours/y6r0pz3gmz2cj7slotq0', 'image/png', 'logo.png', '2025-09-25 14:50:54', '2025-09-25 14:50:54'),
(11, 8, 'https://res.cloudinary.com/dwngcdmmc/image/upload/v1758820766/cours/fgnrb7znrtiyevabslmp.png', 'cours/fgnrb7znrtiyevabslmp', 'image/png', 'logo.png', '2025-09-25 18:19:27', '2025-09-25 18:19:27');

-- --------------------------------------------------------

--
-- Structure de la table `groupes`
--

CREATE TABLE `groupes` (
  `id` int(11) NOT NULL,
  `nom` varchar(50) NOT NULL,
  `informations_supplementaires` text DEFAULT NULL,
  `cree_a` datetime NOT NULL DEFAULT current_timestamp(),
  `mis_a_jour_a` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `groupes`
--

INSERT INTO `groupes` (`id`, `nom`, `informations_supplementaires`, `cree_a`, `mis_a_jour_a`) VALUES
(1, 'INF-G01', '{\"formation\":\"Informatique\",\"description\":\"\",\"capacity\":25,\"status\":\"Actif\"}', '2025-09-25 14:19:20', '2025-09-25 14:19:20'),
(2, 'MEC-G01', '{\"formation\":\"Mécanique\",\"description\":\"\",\"capacity\":25,\"status\":\"Actif\"}', '2025-09-25 14:19:29', '2025-09-25 14:19:29'),
(3, 'LAN-G01', '{\"formation\":\"Langues\",\"description\":\"\",\"capacity\":25,\"status\":\"Actif\"}', '2025-09-25 14:19:36', '2025-09-25 14:19:36');

-- --------------------------------------------------------

--
-- Structure de la table `horaires`
--

CREATE TABLE `horaires` (
  `id` int(11) NOT NULL,
  `groupeId` int(11) NOT NULL,
  `enseignantId` int(11) NOT NULL,
  `moduleId` int(11) NOT NULL,
  `salle` varchar(50) DEFAULT NULL,
  `jour` varchar(20) DEFAULT NULL,
  `heure_debut` time DEFAULT NULL,
  `heure_fin` time DEFAULT NULL,
  `informations_supplementaires` text DEFAULT NULL,
  `cree_a` datetime NOT NULL DEFAULT current_timestamp(),
  `mis_a_jour_a` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `horaires`
--

INSERT INTO `horaires` (`id`, `groupeId`, `enseignantId`, `moduleId`, `salle`, `jour`, `heure_debut`, `heure_fin`, `informations_supplementaires`, `cree_a`, `mis_a_jour_a`) VALUES
(1, 1, 1, 1, 'C01', 'Dimanche', '08:00:00', '09:30:00', '{\"type\":\"Cours\",\"speciality\":\"informatique\",\"createdBy\":\"abc Admin\"}', '2025-09-25 14:23:09', '2025-09-25 14:23:09'),
(2, 1, 1, 2, 'T01', 'Dimanche', '09:30:00', '11:00:00', '{\"type\":\"TD\",\"speciality\":\"informatique\",\"createdBy\":\"abc Admin\"}', '2025-09-25 14:23:26', '2025-09-25 14:23:26'),
(3, 1, 1, 1, 'Lab01', 'Dimanche', '11:00:00', '12:30:00', '{\"type\":\"TP\",\"speciality\":\"informatique\",\"createdBy\":\"abc Admin\"}', '2025-09-25 14:23:39', '2025-09-25 14:23:39'),
(4, 2, 2, 3, 'C01', 'Lundi', '12:30:00', '14:00:00', '{\"type\":\"Cours\",\"speciality\":\"mecanique\",\"createdBy\":\"abc Admin\"}', '2025-09-25 14:24:02', '2025-09-25 14:24:02'),
(5, 2, 2, 4, 'T02', 'Lundi', '14:00:00', '15:30:00', '{\"type\":\"TD\",\"speciality\":\"mecanique\",\"createdBy\":\"abc Admin\"}', '2025-09-25 14:24:34', '2025-09-25 14:24:34'),
(6, 2, 2, 4, 'Lab02', 'Lundi', '15:30:00', '17:00:00', '{\"type\":\"TP\",\"speciality\":\"mecanique\",\"createdBy\":\"abc Admin\"}', '2025-09-25 14:24:54', '2025-09-25 14:24:54'),
(7, 3, 3, 5, 'C02', 'Mardi', '09:30:00', '11:00:00', '{\"type\":\"Cours\",\"speciality\":\"langues\",\"createdBy\":\"abc Admin\"}', '2025-09-25 14:25:44', '2025-09-25 14:25:44'),
(8, 3, 3, 6, 'T01', 'Lundi', '11:00:00', '12:30:00', '{\"type\":\"TD\",\"speciality\":\"langues\",\"createdBy\":\"abc Admin\"}', '2025-09-25 14:26:00', '2025-09-25 14:26:00'),
(9, 3, 3, 5, 'T02', 'Mardi', '12:30:00', '14:00:00', '{\"type\":\"TD\",\"speciality\":\"langues\",\"createdBy\":\"abc Admin\"}', '2025-09-25 14:26:26', '2025-09-25 14:26:26'),
(10, 1, 1, 2, 'Lab01', 'Lundi', '08:00:00', '09:30:00', '{\"type\":\"TP\",\"speciality\":\"informatique\",\"createdBy\":\"abc Admin\"}', '2025-09-30 07:24:51', '2025-09-30 07:24:51'),
(11, 2, 2, 3, 'C01', 'Dimanche', '09:30:00', '11:00:00', '{\"type\":\"Cours\",\"speciality\":\"mecanique\",\"createdBy\":\"abc Admin\"}', '2025-09-30 16:43:27', '2025-09-30 16:43:27');

-- --------------------------------------------------------

--
-- Structure de la table `modules`
--

CREATE TABLE `modules` (
  `id` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `informations_supplementaires` text DEFAULT NULL,
  `cree_a` datetime NOT NULL DEFAULT current_timestamp(),
  `mis_a_jour_a` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `modules`
--

INSERT INTO `modules` (`id`, `nom`, `informations_supplementaires`, `cree_a`, `mis_a_jour_a`) VALUES
(1, 'Base de Données', '{\"speciality\":\"Informatique\",\"description\":\"\",\"coefficient\":4}', '2025-09-25 14:19:53', '2025-09-25 14:19:53'),
(2, 'Algorithmique et Programmation', '{\"speciality\":\"Informatique\",\"description\":\"\",\"coefficient\":4}', '2025-09-25 14:20:11', '2025-09-25 14:20:11'),
(3, 'Fabrication Mécanique', '{\"speciality\":\"Mécanique\",\"description\":\"\",\"coefficient\":4}', '2025-09-25 14:20:25', '2025-09-25 14:20:25'),
(4, 'Mécanique des Fluides', '{\"speciality\":\"Mécanique\",\"description\":\"\",\"coefficient\":6}', '2025-09-25 14:20:37', '2025-09-25 14:20:37'),
(5, 'Français', '{\"speciality\":\"Langues\",\"description\":\"\",\"coefficient\":2}', '2025-09-25 14:21:01', '2025-09-25 14:21:01'),
(6, 'Anglais', '{\"speciality\":\"Langues\",\"description\":\"\",\"coefficient\":4}', '2025-09-25 14:21:15', '2025-09-25 14:21:15');

-- --------------------------------------------------------

--
-- Structure de la table `notes`
--

CREATE TABLE `notes` (
  `id` int(11) NOT NULL,
  `stagiaireId` int(11) NOT NULL,
  `moduleId` int(11) NOT NULL,
  `enseignantId` int(11) NOT NULL,
  `note` decimal(5,2) NOT NULL,
  `informations_supplementaires` text DEFAULT NULL,
  `cree_a` datetime NOT NULL DEFAULT current_timestamp(),
  `mis_a_jour_a` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `notes`
--

INSERT INTO `notes` (`id`, `stagiaireId`, `moduleId`, `enseignantId`, `note`, `informations_supplementaires`, `cree_a`, `mis_a_jour_a`) VALUES
(1, 4, 1, 1, 14.00, 'Type: test1', '2025-09-25 14:42:21', '2025-09-25 14:42:21'),
(2, 4, 1, 1, 15.00, 'Type: test2', '2025-09-25 14:42:21', '2025-09-25 14:42:21'),
(3, 4, 1, 1, 20.00, 'Type: exam', '2025-09-25 14:42:21', '2025-09-25 14:42:21'),
(4, 4, 2, 1, 11.00, 'Type: test1', '2025-09-25 14:42:36', '2025-09-25 14:42:36'),
(5, 4, 2, 1, 13.00, 'Type: test2', '2025-09-25 14:42:36', '2025-09-25 14:42:36'),
(6, 4, 2, 1, 9.00, 'Type: exam', '2025-09-25 14:42:36', '2025-09-25 14:42:36'),
(7, 5, 3, 2, 13.00, 'Type: test1', '2025-09-25 14:48:46', '2025-09-25 14:48:46'),
(8, 5, 3, 2, 13.00, 'Type: test2', '2025-09-25 14:48:46', '2025-09-25 14:48:46'),
(9, 5, 3, 2, 12.00, 'Type: exam', '2025-09-25 14:48:46', '2025-09-25 14:48:46'),
(10, 5, 4, 2, 11.00, 'Type: test1', '2025-09-25 14:49:06', '2025-09-25 14:49:06'),
(11, 5, 4, 2, 14.00, 'Type: test2', '2025-09-25 14:49:06', '2025-09-25 14:49:06'),
(12, 5, 4, 2, 4.00, 'Type: exam', '2025-09-25 14:49:06', '2025-09-25 14:49:06'),
(13, 6, 5, 3, 12.00, 'Type: test1', '2025-09-25 14:51:17', '2025-09-25 14:51:17'),
(14, 6, 5, 3, 13.00, 'Type: test2', '2025-09-25 14:51:17', '2025-09-25 14:51:17'),
(15, 6, 5, 3, 17.00, 'Type: exam', '2025-09-25 14:51:17', '2025-09-25 14:51:17'),
(16, 6, 6, 3, 17.00, 'Type: test1', '2025-09-25 14:51:30', '2025-09-25 14:51:30'),
(17, 6, 6, 3, 20.00, 'Type: test2', '2025-09-25 14:51:30', '2025-09-25 14:51:30'),
(18, 6, 6, 3, 8.00, 'Type: exam', '2025-09-25 14:51:30', '2025-09-25 14:51:30');

-- --------------------------------------------------------

--
-- Structure de la table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `utilisateurId` int(11) NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `titre` varchar(100) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `lu` tinyint(1) DEFAULT 0,
  `informations_supplementaires` text DEFAULT NULL,
  `cree_a` datetime NOT NULL DEFAULT current_timestamp(),
  `mis_a_jour_a` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `notifications`
--

INSERT INTO `notifications` (`id`, `utilisateurId`, `type`, `titre`, `message`, `lu`, `informations_supplementaires`, `cree_a`, `mis_a_jour_a`) VALUES
(1, 1, 'schedule', 'nouveau planning a tout les enseignants ', 'Vous pouvez maintenant', 0, NULL, '2025-09-25 14:37:55', '2025-09-25 14:37:55'),
(2, 2, 'schedule', 'nouveau planning a tout les enseignants ', 'Vous pouvez maintenant', 0, NULL, '2025-09-25 14:37:55', '2025-09-25 14:37:55'),
(3, 3, 'schedule', 'nouveau planning a tout les enseignants ', 'Vous pouvez maintenant', 0, NULL, '2025-09-25 14:37:55', '2025-09-25 14:37:55'),
(4, 4, 'note', 'Nouvelle note en Base de Données', 'Vous avez reçu une nouvelle note de 14', 0, 'Type: test1', '2025-09-25 14:42:21', '2025-09-25 14:42:21'),
(5, 4, 'note', 'Nouvelle note en Base de Données', 'Vous avez reçu une nouvelle note de 15', 0, 'Type: test2', '2025-09-25 14:42:21', '2025-09-25 14:42:21'),
(6, 4, 'note', 'Nouvelle note en Base de Données', 'Vous avez reçu une nouvelle note de 20', 0, 'Type: exam', '2025-09-25 14:42:21', '2025-09-25 14:42:21'),
(7, 4, 'note', 'Nouvelle note en Algorithmique et Programmation', 'Vous avez reçu une nouvelle note de 11', 1, 'Type: test1', '2025-09-25 14:42:36', '2025-09-27 06:35:14'),
(8, 4, 'note', 'Nouvelle note en Algorithmique et Programmation', 'Vous avez reçu une nouvelle note de 13', 0, 'Type: test2', '2025-09-25 14:42:36', '2025-09-25 14:42:36'),
(9, 4, 'note', 'Nouvelle note en Algorithmique et Programmation', 'Vous avez reçu une nouvelle note de 9', 0, 'Type: exam', '2025-09-25 14:42:36', '2025-09-25 14:42:36'),
(10, 5, 'note', 'Nouvelle note en Fabrication Mécanique', 'Vous avez reçu une nouvelle note de 13', 0, 'Type: test1', '2025-09-25 14:48:46', '2025-09-25 14:48:46'),
(11, 5, 'note', 'Nouvelle note en Fabrication Mécanique', 'Vous avez reçu une nouvelle note de 13', 0, 'Type: test2', '2025-09-25 14:48:46', '2025-09-25 14:48:46'),
(12, 5, 'note', 'Nouvelle note en Fabrication Mécanique', 'Vous avez reçu une nouvelle note de 12', 1, 'Type: exam', '2025-09-25 14:48:46', '2025-09-27 06:36:43'),
(13, 5, 'note', 'Nouvelle note en Mécanique des Fluides', 'Vous avez reçu une nouvelle note de 11', 0, 'Type: test1', '2025-09-25 14:49:06', '2025-09-25 14:49:06'),
(14, 5, 'note', 'Nouvelle note en Mécanique des Fluides', 'Vous avez reçu une nouvelle note de 14', 0, 'Type: test2', '2025-09-25 14:49:06', '2025-09-25 14:49:06'),
(15, 5, 'note', 'Nouvelle note en Mécanique des Fluides', 'Vous avez reçu une nouvelle note de 4', 0, 'Type: exam', '2025-09-25 14:49:06', '2025-09-25 14:49:06'),
(16, 6, 'note', 'Nouvelle note en Français', 'Vous avez reçu une nouvelle note de 12', 0, 'Type: test1', '2025-09-25 14:51:17', '2025-09-25 14:51:17'),
(17, 6, 'note', 'Nouvelle note en Français', 'Vous avez reçu une nouvelle note de 13', 0, 'Type: test2', '2025-09-25 14:51:17', '2025-09-25 14:51:17'),
(18, 6, 'note', 'Nouvelle note en Français', 'Vous avez reçu une nouvelle note de 17', 0, 'Type: exam', '2025-09-25 14:51:17', '2025-09-25 14:51:17'),
(19, 6, 'note', 'Nouvelle note en Anglais', 'Vous avez reçu une nouvelle note de 17', 0, 'Type: test1', '2025-09-25 14:51:30', '2025-09-25 14:51:30'),
(20, 6, 'note', 'Nouvelle note en Anglais', 'Vous avez reçu une nouvelle note de 20', 0, 'Type: test2', '2025-09-25 14:51:30', '2025-09-25 14:51:30'),
(21, 6, 'note', 'Nouvelle note en Anglais', 'Vous avez reçu une nouvelle note de 8', 0, 'Type: exam', '2025-09-25 14:51:30', '2025-09-25 14:51:30'),
(22, 4, 'schedule', 'modification dans la journée de dimanche', 'Vous pouvez maintenant de consulter vous planning', 1, NULL, '2025-09-27 06:37:45', '2025-09-29 10:25:44'),
(23, 5, 'schedule', 'modification dans la journée de dimanche', 'Vous pouvez maintenant de consulter vous planning', 0, NULL, '2025-09-27 06:37:45', '2025-09-27 06:37:45'),
(24, 6, 'schedule', 'modification dans la journée de dimanche', 'Vous pouvez maintenant de consulter vous planning', 0, NULL, '2025-09-27 06:37:45', '2025-09-27 06:37:45'),
(25, 4, 'announcement', 'Nouvel mise a jour de système', 'KB 19220382 ', 1, NULL, '2025-09-27 06:43:41', '2025-09-29 10:26:17'),
(26, 5, 'announcement', 'Nouvel mise a jour de système', 'KB 19220382 ', 0, NULL, '2025-09-27 06:43:41', '2025-09-27 06:43:41'),
(27, 6, 'announcement', 'Nouvel mise a jour de système', 'KB 19220382 ', 0, NULL, '2025-09-27 06:43:41', '2025-09-27 06:43:41'),
(28, 1, 'schedule', 'modification dans la journée de LUNDI', 'OK', 1, NULL, '2025-09-30 07:26:03', '2025-09-30 07:26:38');

-- --------------------------------------------------------

--
-- Structure de la table `profils`
--

CREATE TABLE `profils` (
  `id` int(11) NOT NULL,
  `utilisateurId` int(11) NOT NULL,
  `photo` varchar(255) DEFAULT NULL,
  `specialite` varchar(100) DEFAULT NULL,
  `numero_carte_identite` varchar(100) DEFAULT NULL,
  `informations_supplementaires` text DEFAULT NULL,
  `photo_public_id` varchar(255) DEFAULT NULL,
  `cree_a` datetime NOT NULL DEFAULT current_timestamp(),
  `mis_a_jour_a` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `profils`
--

INSERT INTO `profils` (`id`, `utilisateurId`, `photo`, `specialite`, `numero_carte_identite`, `informations_supplementaires`, `photo_public_id`, `cree_a`, `mis_a_jour_a`) VALUES
(1, 1, 'https://res.cloudinary.com/dwngcdmmc/image/upload/v1758804706/profils/image_01.jpg.png', 'informatique', 'E00001', '{\"lastName\":\"Kamal\",\"firstName\":\"abc\",\"birthDate\":\"2003-02-10\",\"gender\":\"homme\",\"email\":\"Kamal_abc@gmail.com\",\"phone\":\"0666218828\",\"specialty\":\"informatique\",\"address\":\"10 Bouira\",\"experience\":\"8\",\"qualification\":\"doctorat\",\"documents\":{\"idCard\":null,\"cv\":null,\"diploma\":null}}', 'profils/image_01.jpg', '2025-09-25 13:51:47', '2025-09-25 13:51:47'),
(2, 2, 'https://res.cloudinary.com/dwngcdmmc/image/upload/v1758382917/profils/image_05.png.png', 'mecanique', 'E00002', '{\"lastName\":\"Kaci\",\"firstName\":\"abc\",\"birthDate\":\"2003-02-10\",\"gender\":\"homme\",\"email\":\"Kaci_abc@gmail.com\",\"phone\":\"0666218828\",\"specialty\":\"mecanique\",\"address\":\"16 Alger\",\"experience\":\"5\",\"qualification\":\"bac+5\",\"documents\":{\"idCard\":null,\"cv\":null,\"diploma\":null}}', 'profils/image_05.png', '2025-09-25 14:14:09', '2025-09-25 14:14:09'),
(3, 3, 'https://res.cloudinary.com/dwngcdmmc/image/upload/v1758806123/profils/images_06.jpg.png', 'langues', 'E00003', '{\"lastName\":\"Belkacem\",\"firstName\":\"abc\",\"birthDate\":\"2003-02-10\",\"gender\":\"homme\",\"email\":\"Belkacem_abc@gmail.com\",\"phone\":\"0666218828\",\"specialty\":\"langues\",\"address\":\"19 Sétif\",\"experience\":\"10\",\"qualification\":\"doctorat\",\"documents\":{\"idCard\":null,\"cv\":null,\"diploma\":null}}', 'profils/images_06.jpg', '2025-09-25 14:15:25', '2025-09-25 14:15:25'),
(4, 4, 'https://res.cloudinary.com/dwngcdmmc/image/upload/v1758806195/profils/image_02.jpg.png', 'informatique', 'S00001', '{\"lastName\":\"Amine\",\"firstName\":\"abc\",\"birthDate\":\"2003-02-10\",\"gender\":\"homme\",\"email\":\"Amine_abc@gmail.com\",\"phone\":\"0666218828\",\"formation\":\"informatique\",\"address\":\"06 Bejaia\",\"studyLevel\":\"bac\",\"emergencyContact\":\"\",\"emergencyName\":\"\",\"relationship\":\"\",\"additionalInfo\":\"\"}', 'profils/image_02.jpg', '2025-09-25 14:16:38', '2025-09-25 14:16:38'),
(5, 5, 'https://res.cloudinary.com/dwngcdmmc/image/upload/v1758806256/profils/image_03.jpg.png', 'mecanique', 'S00002', '{\"lastName\":\"Adem\",\"firstName\":\"abc\",\"birthDate\":\"2003-02-10\",\"gender\":\"homme\",\"email\":\"Adem_abc@gmail.com\",\"phone\":\"0666218828\",\"formation\":\"mecanique\",\"address\":\"15 Tizi ouzou\",\"studyLevel\":\"lycee\",\"emergencyContact\":\"\",\"emergencyName\":\"\",\"relationship\":\"\",\"additionalInfo\":\"\"}', 'profils/image_03.jpg', '2025-09-25 14:17:40', '2025-09-25 14:17:40'),
(6, 6, 'https://res.cloudinary.com/dwngcdmmc/image/upload/v1758806319/profils/image_04.jpg.png', 'langues', 'S00003', '{\"lastName\":\"Ahmed\",\"firstName\":\"abc\",\"birthDate\":\"2003-02-10\",\"gender\":\"homme\",\"email\":\"Ahmed_abc@gmail.com\",\"phone\":\"0666218828\",\"formation\":\"langues\",\"address\":\"01 Adrar\",\"studyLevel\":\"college\",\"emergencyContact\":\"\",\"emergencyName\":\"\",\"relationship\":\"\",\"additionalInfo\":\"\"}', 'profils/image_04.jpg', '2025-09-25 14:18:44', '2025-09-25 14:18:44');

-- --------------------------------------------------------

--
-- Structure de la table `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `nom` varchar(255) NOT NULL,
  `informations_supplementaires` text DEFAULT NULL,
  `cree_a` datetime NOT NULL DEFAULT current_timestamp(),
  `mis_a_jour_a` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `roles`
--

INSERT INTO `roles` (`id`, `nom`, `informations_supplementaires`, `cree_a`, `mis_a_jour_a`) VALUES
(1, 'stagiaire', NULL, '2025-09-25 13:45:54', '2025-09-25 13:45:54'),
(2, 'enseignant', NULL, '2025-09-25 13:45:54', '2025-09-25 13:45:54'),
(3, 'admin', NULL, '2025-09-25 13:45:54', '2025-09-25 13:45:54');

-- --------------------------------------------------------

--
-- Structure de la table `utilisateurs`
--

CREATE TABLE `utilisateurs` (
  `id` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `mot_de_passe` varchar(255) NOT NULL,
  `informations_supplementaires` text DEFAULT NULL,
  `cree_a` datetime NOT NULL DEFAULT current_timestamp(),
  `mis_a_jour_a` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `utilisateurs`
--

INSERT INTO `utilisateurs` (`id`, `nom`, `email`, `mot_de_passe`, `informations_supplementaires`, `cree_a`, `mis_a_jour_a`) VALUES
(1, 'abc Kamal', 'Kamal_abc@gmail.com', '$2a$08$QeWLPuUVjoMg9uGlB40aUOF0s.j5GRnAQz8XBxBNw7DG/.puI3mGq', '{\"matricule\":\"E00001\"}', '2025-09-25 13:45:59', '2025-09-25 13:45:59'),
(2, 'abc Kaci', 'Kaci_abc@gmail.com', '$2a$08$VxY3xKWM1vqCaWGEqPvkz.KmcritYyY5GJ5ZvdY9x4zHSaEl6u77W', '{\"matricule\":\"E00002\"}', '2025-09-25 13:46:28', '2025-09-25 13:46:28'),
(3, 'abc Belkacem', 'Belkacem_abc@gmail.com', '$2a$08$vK9WLartEb01ERGYlxnVfuJbg9o2aWOw69sMYqpB56hUF6i1zy2gK', '{\"matricule\":\"E00003\"}', '2025-09-25 13:46:56', '2025-09-25 13:46:56'),
(4, 'abc Amine', 'Amine_abc@gmail.com', '$2a$08$xdlcpqhYliLoI86IVXgoz.hjFti5hmcU82mPqHavFoXj4J8b8u7XC', '{\"matricule\":\"S00001\"}', '2025-09-25 13:47:18', '2025-09-25 13:47:18'),
(5, 'abc Adem', 'Adem_abc@gmail.com', '$2a$08$3PPAU5HIAOBUdXTrqVslJOj8knA2Bz8bEum8uAKdNulqKSK.p.cli', '{\"matricule\":\"S00002\"}', '2025-09-25 13:47:38', '2025-09-25 13:47:38'),
(6, 'abc Ahmed', 'Ahmed_abc@gmail.com', '$2a$08$MZ.OOUO2IZ0iW4aoWREfleQHLMsdR/7.EwhjKUMC/O/56hUPy5idq', '{\"matricule\":\"S00003\"}', '2025-09-25 13:48:08', '2025-09-25 13:48:08'),
(7, 'abc Admin', 'Admin_abc@gmail.com', '$2a$08$jbKjC80AXqCpDpkGUGSRR.XuyjGwOkf5aUyWXUqB9xj5jJI5Taswm', NULL, '2025-09-25 13:49:49', '2025-09-30 16:30:15');

-- --------------------------------------------------------

--
-- Structure de la table `utilisateur_groupes`
--

CREATE TABLE `utilisateur_groupes` (
  `id` int(11) NOT NULL,
  `stagiaireId` int(11) NOT NULL,
  `groupeId` int(11) NOT NULL,
  `informations_supplementaires` text DEFAULT NULL,
  `cree_a` datetime NOT NULL DEFAULT current_timestamp(),
  `mis_a_jour_a` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `utilisateur_groupes`
--

INSERT INTO `utilisateur_groupes` (`id`, `stagiaireId`, `groupeId`, `informations_supplementaires`, `cree_a`, `mis_a_jour_a`) VALUES
(1, 4, 1, NULL, '2025-09-25 14:22:34', '2025-09-25 14:22:34'),
(2, 5, 2, NULL, '2025-09-25 14:22:38', '2025-09-25 14:22:38'),
(3, 6, 3, NULL, '2025-09-25 14:22:45', '2025-09-25 14:22:45');

-- --------------------------------------------------------

--
-- Structure de la table `utilisateur_modules`
--

CREATE TABLE `utilisateur_modules` (
  `id` int(11) NOT NULL,
  `enseignantId` int(11) NOT NULL,
  `moduleId` int(11) NOT NULL,
  `groupeId` int(11) NOT NULL,
  `informations_supplementaires` text DEFAULT NULL,
  `cree_a` datetime NOT NULL DEFAULT current_timestamp(),
  `mis_a_jour_a` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `utilisateur_modules`
--

INSERT INTO `utilisateur_modules` (`id`, `enseignantId`, `moduleId`, `groupeId`, `informations_supplementaires`, `cree_a`, `mis_a_jour_a`) VALUES
(1, 1, 1, 1, NULL, '2025-09-25 14:21:42', '2025-09-25 14:21:42'),
(2, 1, 2, 1, NULL, '2025-09-25 14:21:50', '2025-09-25 14:21:50'),
(3, 2, 3, 2, NULL, '2025-09-25 14:22:00', '2025-09-25 14:22:00'),
(4, 2, 4, 2, NULL, '2025-09-25 14:22:08', '2025-09-25 14:22:08'),
(5, 3, 5, 3, NULL, '2025-09-25 14:22:19', '2025-09-25 14:22:19'),
(6, 3, 6, 3, NULL, '2025-09-25 14:22:27', '2025-09-25 14:22:27');

-- --------------------------------------------------------

--
-- Structure de la table `utilisateur_roles`
--

CREATE TABLE `utilisateur_roles` (
  `id` int(11) NOT NULL,
  `utilisateurId` int(11) NOT NULL,
  `roleId` int(11) NOT NULL,
  `informations_supplementaires` text DEFAULT NULL,
  `cree_a` datetime NOT NULL DEFAULT current_timestamp(),
  `mis_a_jour_a` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `utilisateur_roles`
--

INSERT INTO `utilisateur_roles` (`id`, `utilisateurId`, `roleId`, `informations_supplementaires`, `cree_a`, `mis_a_jour_a`) VALUES
(1, 1, 2, '{\"matricule\":\"E00001\"}', '2025-09-25 13:45:59', '2025-09-25 13:45:59'),
(2, 2, 2, '{\"matricule\":\"E00002\"}', '2025-09-25 13:46:28', '2025-09-25 13:46:28'),
(3, 3, 2, '{\"matricule\":\"E00003\"}', '2025-09-25 13:46:56', '2025-09-25 13:46:56'),
(4, 4, 1, '{\"matricule\":\"S00001\"}', '2025-09-25 13:47:18', '2025-09-25 13:47:18'),
(5, 5, 1, '{\"matricule\":\"S00002\"}', '2025-09-25 13:47:38', '2025-09-25 13:47:38'),
(6, 6, 1, '{\"matricule\":\"S00003\"}', '2025-09-25 13:48:08', '2025-09-25 13:48:08'),
(7, 7, 3, NULL, '2025-09-25 13:50:27', '2025-09-25 13:50:27');

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `cours`
--
ALTER TABLE `cours`
  ADD PRIMARY KEY (`id`),
  ADD KEY `moduleId` (`moduleId`),
  ADD KEY `enseignantId` (`enseignantId`);

--
-- Index pour la table `cours_fichiers`
--
ALTER TABLE `cours_fichiers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `coursId` (`coursId`);

--
-- Index pour la table `groupes`
--
ALTER TABLE `groupes`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `horaires`
--
ALTER TABLE `horaires`
  ADD PRIMARY KEY (`id`),
  ADD KEY `groupeId` (`groupeId`),
  ADD KEY `enseignantId` (`enseignantId`),
  ADD KEY `moduleId` (`moduleId`);

--
-- Index pour la table `modules`
--
ALTER TABLE `modules`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `notes`
--
ALTER TABLE `notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `stagiaireId` (`stagiaireId`),
  ADD KEY `moduleId` (`moduleId`),
  ADD KEY `enseignantId` (`enseignantId`);

--
-- Index pour la table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `utilisateurId` (`utilisateurId`);

--
-- Index pour la table `profils`
--
ALTER TABLE `profils`
  ADD PRIMARY KEY (`id`),
  ADD KEY `utilisateurId` (`utilisateurId`);

--
-- Index pour la table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nom` (`nom`);

--
-- Index pour la table `utilisateurs`
--
ALTER TABLE `utilisateurs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Index pour la table `utilisateur_groupes`
--
ALTER TABLE `utilisateur_groupes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_stagiaire_groupe` (`stagiaireId`,`groupeId`),
  ADD KEY `groupeId` (`groupeId`);

--
-- Index pour la table `utilisateur_modules`
--
ALTER TABLE `utilisateur_modules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_enseignant_module_groupe` (`enseignantId`,`moduleId`,`groupeId`),
  ADD KEY `moduleId` (`moduleId`),
  ADD KEY `groupeId` (`groupeId`);

--
-- Index pour la table `utilisateur_roles`
--
ALTER TABLE `utilisateur_roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_utilisateur_role` (`utilisateurId`,`roleId`),
  ADD KEY `roleId` (`roleId`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `cours`
--
ALTER TABLE `cours`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT pour la table `cours_fichiers`
--
ALTER TABLE `cours_fichiers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT pour la table `groupes`
--
ALTER TABLE `groupes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `horaires`
--
ALTER TABLE `horaires`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT pour la table `modules`
--
ALTER TABLE `modules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT pour la table `notes`
--
ALTER TABLE `notes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT pour la table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT pour la table `profils`
--
ALTER TABLE `profils`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT pour la table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `utilisateurs`
--
ALTER TABLE `utilisateurs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT pour la table `utilisateur_groupes`
--
ALTER TABLE `utilisateur_groupes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `utilisateur_modules`
--
ALTER TABLE `utilisateur_modules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT pour la table `utilisateur_roles`
--
ALTER TABLE `utilisateur_roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `cours`
--
ALTER TABLE `cours`
  ADD CONSTRAINT `cours_ibfk_1` FOREIGN KEY (`moduleId`) REFERENCES `modules` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `cours_ibfk_2` FOREIGN KEY (`enseignantId`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `cours_fichiers`
--
ALTER TABLE `cours_fichiers`
  ADD CONSTRAINT `cours_fichiers_ibfk_1` FOREIGN KEY (`coursId`) REFERENCES `cours` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `horaires`
--
ALTER TABLE `horaires`
  ADD CONSTRAINT `horaires_ibfk_1` FOREIGN KEY (`groupeId`) REFERENCES `groupes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `horaires_ibfk_2` FOREIGN KEY (`enseignantId`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `horaires_ibfk_3` FOREIGN KEY (`moduleId`) REFERENCES `modules` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `notes`
--
ALTER TABLE `notes`
  ADD CONSTRAINT `notes_ibfk_1` FOREIGN KEY (`stagiaireId`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `notes_ibfk_2` FOREIGN KEY (`moduleId`) REFERENCES `modules` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `notes_ibfk_3` FOREIGN KEY (`enseignantId`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`utilisateurId`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `profils`
--
ALTER TABLE `profils`
  ADD CONSTRAINT `profils_ibfk_1` FOREIGN KEY (`utilisateurId`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `utilisateur_groupes`
--
ALTER TABLE `utilisateur_groupes`
  ADD CONSTRAINT `utilisateur_groupes_ibfk_1` FOREIGN KEY (`stagiaireId`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `utilisateur_groupes_ibfk_2` FOREIGN KEY (`groupeId`) REFERENCES `groupes` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `utilisateur_modules`
--
ALTER TABLE `utilisateur_modules`
  ADD CONSTRAINT `utilisateur_modules_ibfk_1` FOREIGN KEY (`enseignantId`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `utilisateur_modules_ibfk_2` FOREIGN KEY (`moduleId`) REFERENCES `modules` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `utilisateur_modules_ibfk_3` FOREIGN KEY (`groupeId`) REFERENCES `groupes` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `utilisateur_roles`
--
ALTER TABLE `utilisateur_roles`
  ADD CONSTRAINT `utilisateur_roles_ibfk_1` FOREIGN KEY (`utilisateurId`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `utilisateur_roles_ibfk_2` FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
