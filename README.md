# API Documentation - Esprit Student Backend

## 🚀 Démarrage

### Installation et lancement
```bash
cd BackOffice
npm install
npm run dev
```

Le serveur sera accessible sur `http://localhost:3000`

### Configuration requise
- MongoDB en cours d'exécution
- Fichier `.env` configuré avec `MONGO_URI` et `JWT_SECRET`

## 📋 Endpoints principaux

### 🔐 Authentification (`/api/auth`)

#### POST `/api/auth/login`
Connexion universelle (Admin, User, Club)
```json
{
  "email": "admin@example.com",
  "password": "motdepasse"
}
```

#### POST `/api/auth/logout`
Déconnexion

#### GET `/api/auth/verify`
Vérifier le token JWT (avec header Authorization: Bearer TOKEN)

#### POST `/api/auth/forgot-password`
Réinitialiser le mot de passe
```json
{
  "email": "user@example.com"
}
```

#### POST `/api/auth/change-password`
Changer le mot de passe (utilisateur connecté)
```json
{
  "currentPassword": "ancien",
  "newPassword": "nouveau"
}
```

### 👥 Gestion des utilisateurs (`/api/users`) - Admin uniquement

#### GET `/api/users`
Lister tous les utilisateurs (avec pagination)
- Query params: `page`, `limit`, `role`, `statut`, `search`

#### POST `/api/users`
Créer un nouvel utilisateur
```json
{
  "email": "user@example.com",
  "nom": "Doe",
  "prenom": "John",
  "role": "club_manager",
  "telephone": "12345678",
  "clubAssigne": "club_id_optionnel"
}
```

#### GET `/api/users/:id`
Obtenir un utilisateur par ID

#### PUT `/api/users/:id`
Mettre à jour un utilisateur

#### DELETE `/api/users/:id`
Supprimer un utilisateur

#### POST `/api/users/:id/reset-password`
Réinitialiser le mot de passe d'un utilisateur

#### GET `/api/users/stats`
Statistiques des utilisateurs

### 🏛️ Gestion des clubs (`/api/clubs`)

#### GET `/api/clubs` (Admin)
Lister tous les clubs avec pagination
- Query params: `page`, `limit`, `statut`, `categorie`, `search`

#### GET `/api/clubs/my/profile` (Club connecté)
Obtenir son propre profil

#### PUT `/api/clubs/my/profile` (Club connecté)
Mettre à jour son profil

#### POST `/api/clubs/my/change-password` (Club connecté)
Changer son mot de passe

#### GET `/api/clubs/:id` (Admin/Club)
Obtenir un club par ID

#### PUT `/api/clubs/:id/profile` (Admin)
Mettre à jour le profil d'un club

#### DELETE `/api/clubs/:id` (Admin)
Supprimer un club

#### PUT `/api/clubs/:id/assign-responsable` (Admin)
Assigner un responsable à un club
```json
{
  "responsableId": "user_id"
}
```

#### GET `/api/clubs/stats` (Admin)
Statistiques des clubs

### 🎉 Gestion des événements (`/api/events`)

#### GET `/api/events`
Lister tous les événements (Admin voit tout, Club voit les siens)
- Query params: `page`, `limit`, `statut`, `typeEvent`, `clubId`, `search`, `dateDebut`, `dateFin`

#### GET `/api/events/my/events` (Club connecté)
Obtenir ses propres événements

#### POST `/api/events` (Club connecté)
Créer un nouvel événement
```json
{
  "titre": "Mon événement",
  "description": "Description détaillée",
  "dateDebut": "2024-01-15T10:00:00Z",
  "dateFin": "2024-01-15T18:00:00Z",
  "lieu": "Salle A",
  "typeEvent": "conference",
  "public": "etudiants",
  "gratuit": true
}
```

#### GET `/api/events/:id`
Obtenir un événement par ID

#### PUT `/api/events/:id`
Mettre à jour un événement (Club pour ses événements, Admin pour tous)

#### DELETE `/api/events/:id`
Supprimer un événement

#### PUT `/api/events/:id/validate` (Admin uniquement)
Valider/Rejeter un événement
```json
{
  "statut": "valide", // ou "rejete"
  "raisonRejet": "Raison du rejet (optionnel)"
}
```

#### GET `/api/events/stats` (Admin)
Statistiques des événements

### 🎯 Première connexion (`/api/first-login`) - Club uniquement

#### GET `/api/first-login/check`
Vérifier si c'est la première connexion

#### GET `/api/first-login/guide`
Obtenir le guide d'aide pour compléter le profil

#### POST `/api/first-login/complete`
Compléter le profil lors de la première connexion
```json
{
  "description": "Description du club",
  "membres": 50,
  "president": {
    "nom": "Dupont",
    "prenom": "Marie",
    "email": "marie@example.com",
    "telephone": "12345678"
  },
  "contact": {
    "telephone": "87654321",
    "email": "contact@club.com"
  },
  "detailsComplets": {
    "presentation": "Présentation détaillée",
    "objectifs": ["Objectif 1", "Objectif 2"]
  }
}
```

#### POST `/api/first-login/save-draft`
Sauvegarder un brouillon du profil

### 📊 Dashboard Admin (`/api/admin`)

#### GET `/api/admin/dashboard/stats`
Statistiques complètes pour le dashboard
```json
{
  "overview": {
    "totalClubs": 25,
    "clubsActifs": 20,
    "totalEvents": 150,
    "eventsEnAttente": 5
  },
  "charts": {
    "eventsByCategory": [...],
    "clubsByCategory": [...],
    "weeklyActivity": [...]
  },
  "recent": {
    "events": [...],
    "clubs": [...]
  }
}
```

#### POST `/api/admin/clubs`
Créer un nouveau club
```json
{
  "nom": "Nouveau Club",
  "email": "club@example.com",
  "categorie": "technologique",
  "description": "Description optionnelle",
  "responsable": "user_id_optionnel"
}
```

#### PUT `/api/admin/clubs/:id/status`
Changer le statut d'un club
```json
{
  "statut": "actif", // ou "inactif", "suspendu", "rejete"
  "raisonRejet": "Raison (optionnel)"
}
```

#### PUT `/api/admin/events/:id/status`
Changer le statut d'un événement
```json
{
  "statut": "valide", // ou "rejete", "annule"
  "raisonRejet": "Raison (optionnel)"
}
```

## 🔒 Système d'authentification

### Rôles disponibles
- `admin`: Accès complet au système
- `club_manager`: Gestion d'un club assigné
- `club`: Compte club (créé par admin)

### Types d'utilisateurs
- `admin`: Administrateur système
- `user`: Utilisateur avec rôles spécifiques
- `club`: Compte club

### Middleware de sécurité
- `auth(['admin'])`: Seuls les admins
- `auth(['club'])`: Seuls les clubs
- `auth(['admin', 'club'])`: Admins et clubs
- `ensureOwnClub`: Vérifie que le club ne modifie que ses données

## 📝 Format des réponses

### Succès
```json
{
  "success": true,
  "message": "Message de succès",
  "data": { ... }
}
```

### Erreur
```json
{
  "success": false,
  "message": "Message d'erreur",
  "errors": ["Détails optionnels"]
}
```

### Pagination
```json
{
  "data": {
    "items": [...],
    "pagination": {
      "current": 1,
      "total": 5,
      "count": 10,
      "totalItems": 50
    }
  }
}
```

## 🧪 Tests avec curl/Postman

### 1. Connexion Admin
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@esprit.tn","password":"admin123"}'
```

### 2. Créer un club (avec token admin)
```bash
curl -X POST http://localhost:3000/api/admin/clubs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"nom":"Club Tech","email":"tech@esprit.tn","categorie":"technologique"}'
```

### 3. Connexion Club
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tech@esprit.tn","password":"GENERATED_PASSWORD"}'
```

### 4. Créer un événement (avec token club)
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CLUB_TOKEN" \
  -d '{"titre":"Hackathon 2024","description":"Concours de programmation","dateDebut":"2024-03-15T09:00:00Z","dateFin":"2024-03-15T18:00:00Z","lieu":"Lab Info","typeEvent":"competition"}'
```

## 🔧 Variables d'environnement (.env)

```env
MONGO_URI=mongodb://127.0.0.1:27017/espritStudent
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=24h
PORT=3000
NODE_ENV=development

# Email (optionnel)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

## 📁 Structure des données

### Modèle Club
```javascript
{
  nom: String,
  email: String,
  categorie: String, // sportif, culturel, technologique, etc.
  statut: String, // actif, inactif, en_attente, suspendu
  premiereConnexion: Boolean,
  profileComplet: Boolean,
  president: {
    nom: String,
    prenom: String,
    email: String,
    telephone: String
  },
  detailsComplets: {
    presentation: String,
    objectifs: [String],
    // ... autres détails
  }
}
```

### Modèle Event
```javascript
{
  clubId: ObjectId,
  titre: String,
  description: String,
  dateDebut: Date,
  dateFin: Date,
  lieu: String,
  typeEvent: String, // conference, atelier, competition, etc.
  statut: String, // en_attente, valide, rejete, annule
  public: String, // etudiants, professeurs, externe, mixte
  gratuit: Boolean,
  valideBy: ObjectId // ID de l'admin qui a validé
}
```

## 🚨 Gestion d'erreurs

L'API gère automatiquement :
- Erreurs de validation MongoDB
- Erreurs de duplication (email existant)
- Erreurs d'authentification JWT
- Erreurs de permission
- Erreurs de format de données

## 📧 Notifications email

Le système envoie automatiquement des emails pour :
- Création de nouveaux comptes (club/user)
- Validation/rejet d'événements
- Changement de statut de club
- Réinitialisation de mots de passe

## 🔄 Workflow typique

1. **Admin** se connecte et crée des clubs
2. **Club** reçoit ses identifiants par email
3. **Club** se connecte pour la première fois
4. **Club** complète son profil obligatoire
5. **Club** peut créer des événements
6. **Admin** valide les événements
7. **Événements validés** sont publiés