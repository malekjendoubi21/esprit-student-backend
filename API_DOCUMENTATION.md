# API Backend Esprit Student - Documentation

## 🚀 Démarrage rapide

### Installation et lancement
```bash
cd BackOffice
npm install
npm run init-data  # Initialiser les données de test
npm run dev        # Lancer en mode développement
```

Le serveur démarre sur `http://localhost:3000`

## 🔐 Authentification

Tous les endpoints (sauf login) nécessitent un token JWT dans les headers :
```
Authorization: Bearer <token>
```

### Comptes de test
- **Admin**: admin@esprit.tn / admin123
- **Gestionnaire**: manager1@esprit.tn / user123  
- **Club ACM**: acm@esprit.tn / club123
- **Club Enactus**: enactus@esprit.tn / club123

## 📚 Endpoints de l'API

### 🔑 Authentification (`/api/auth`)

#### POST `/api/auth/login`
Connexion universelle (admin, user, club)
```json
{
  "email": "admin@esprit.tn",
  "password": "admin123"
}
```

#### POST `/api/auth/logout`
Déconnexion (token requis)

#### POST `/api/auth/forgot-password`
Mot de passe oublié
```json
{
  "email": "user@example.com"
}
```

#### POST `/api/auth/change-password`
Changer le mot de passe (token requis)
```json
{
  "currentPassword": "ancien123",
  "newPassword": "nouveau123"
}
```

#### GET `/api/auth/verify`
Vérifier le token et récupérer les infos utilisateur

---

### 👨‍💼 Administration (`/api/admin`) - Admin seulement

#### GET `/api/admin/dashboard/stats`
Statistiques du dashboard
- Nombres de clubs, events, utilisateurs
- Graphiques par catégorie
- Activité récente

#### POST `/api/admin/clubs`
Créer un nouveau club
```json
{
  "nom": "Nouveau Club",
  "email": "club@esprit.tn",
  "categorie": "technologique",
  "description": "Description du club",
  "responsable": "user_id_optional"
}
```

#### PUT `/api/admin/clubs/:id/status`
Valider/rejeter un club
```json
{
  "statut": "actif", // ou "rejete", "suspendu"
  "raisonRejet": "Raison optionnelle"
}
```

#### PUT `/api/admin/events/:id/status`
Valider/rejeter un événement
```json
{
  "statut": "valide", // ou "rejete", "annule"
  "raisonRejet": "Raison optionnelle"
}
```

---

### 👥 Gestion des utilisateurs (`/api/users`) - Admin seulement

#### GET `/api/users`
Lister les utilisateurs
- Paramètres : `page`, `limit`, `search`, `role`, `statut`

#### GET `/api/users/:id`
Détails d'un utilisateur

#### POST `/api/users`
Créer un utilisateur
```json
{
  "email": "user@example.com",
  "nom": "Nom",
  "prenom": "Prénom",
  "role": "club_manager",
  "telephone": "+216 12 345 678",
  "clubAssigne": "club_id_optional",
  "permissions": ["create_event", "edit_event"]
}
```

#### PUT `/api/users/:id`
Modifier un utilisateur

#### DELETE `/api/users/:id`
Supprimer un utilisateur

#### POST `/api/users/:id/reset-password`
Réinitialiser le mot de passe

---

### 🏢 Gestion des clubs (`/api/clubs`)

#### GET `/api/clubs`
Lister les clubs (admin) ou son club (club)
- Paramètres : `page`, `limit`, `search`, `statut`, `categorie`

#### GET `/api/clubs/:id`
Détails d'un club

#### POST `/api/clubs` (Admin seulement)
Créer un club

#### PUT `/api/clubs/:id`
Modifier un club (admin ou club propriétaire)

#### DELETE `/api/clubs/:id` (Admin seulement)
Supprimer un club

#### GET `/api/clubs/:id/events`
Événements d'un club

#### GET `/api/clubs/:id/stats`
Statistiques d'un club

---

### 🎉 Gestion des événements (`/api/events`)

#### GET `/api/events`
Lister les événements
- Paramètres : `page`, `limit`, `search`, `statut`, `typeEvent`, `clubId`, `dateDebut`, `dateFin`

#### GET `/api/events/:id`
Détails d'un événement

#### POST `/api/events`
Créer un événement (club)
```json
{
  "titre": "Mon Événement",
  "description": "Description détaillée",
  "dateDebut": "2025-12-01T10:00:00",
  "dateFin": "2025-12-01T17:00:00",
  "lieu": "Salle de conférence",
  "typeEvent": "conference",
  "capaciteMax": 100,
  "gratuit": true,
  "public": "etudiants"
}
```

#### PUT `/api/events/:id`
Modifier un événement (club propriétaire ou admin)

#### DELETE `/api/events/:id`
Supprimer un événement

---

### 🎯 Première connexion club (`/api/first-login`) - Club seulement

#### GET `/api/first-login/check`
Vérifier le statut de première connexion

#### POST `/api/first-login/complete`
Compléter le profil lors de la première connexion
```json
{
  "president": {
    "nom": "Nom du président",
    "prenom": "Prénom",
    "email": "president@example.com",
    "telephone": "+216 12 345 678"
  },
  "contact": {
    "telephone": "+216 71 123 456",
    "adresse": "Adresse du club"
  },
  "detailsComplets": {
    "presentation": "Présentation détaillée du club",
    "objectifs": ["Objectif 1", "Objectif 2"],
    "activitesDetaillees": ["Activité 1", "Activité 2"],
    "valeurs": ["Valeur 1", "Valeur 2"]
  },
  "reseauxSociaux": {
    "facebook": "https://facebook.com/club",
    "instagram": "https://instagram.com/club"
  }
}
```

#### PUT `/api/first-login/skip`
Passer la première connexion (à compléter plus tard)

---

## 🧪 Tests avec curl/Postman

### Exemple de connexion admin
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@esprit.tn","password":"admin123"}'
```

### Exemple de récupération des stats
```bash
curl -X GET http://localhost:3000/api/admin/dashboard/stats \
  -H "Authorization: Bearer <token>"
```

### Exemple de création d'événement (club)
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer <club_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "titre": "Workshop Test",
    "description": "Description test",
    "dateDebut": "2025-12-01T10:00:00",
    "dateFin": "2025-12-01T17:00:00",
    "lieu": "Salle A",
    "typeEvent": "atelier",
    "gratuit": true
  }'
```

## 🔒 Permissions et rôles

### Rôles
- **admin** : Accès complet
- **moderateur** : Validation événements, gestion clubs
- **club_manager** : Gestion club assigné
- **club** : Gestion de son propre club

### Permissions spécifiques
- `manage_users` : Gérer les utilisateurs
- `create_club`, `edit_club`, `delete_club` : Gestion clubs
- `create_event`, `edit_event`, `delete_event` : Gestion événements
- `validate_event` : Validation événements

## 🚀 Statuts

### Clubs
- `en_attente` : En attente de validation
- `actif` : Club actif
- `inactif` : Club désactivé
- `suspendu` : Club suspendu temporairement

### Événements
- `en_attente` : En attente de validation
- `valide` : Événement validé et publié
- `rejete` : Événement rejeté
- `annule` : Événement annulé
- `termine` : Événement terminé

## 🛠️ Base de données

L'API utilise MongoDB avec Mongoose. Les collections sont :
- `admins` : Comptes administrateurs
- `users` : Utilisateurs gestionnaires
- `clubs` : Clubs étudiants
- `events` : Événements
- `logs` : Logs système (optionnel)

## 📧 Emails

Les emails sont envoyés automatiquement pour :
- Création de comptes (mot de passe)
- Réinitialisation mot de passe
- Validation/rejet clubs
- Validation/rejet événements

Configuration dans `.env` :
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre_email@gmail.com
EMAIL_PASS=votre_mot_de_passe_app
```