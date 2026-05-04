# 🎤 Catalogue Karaoké

App web mobile-first pour parcourir le catalogue karaoké, sauvegarder ses favoris et synchroniser les nouvelles chansons depuis `e-events.codewave.nc`.

## Stack

- **Frontend** : React + TypeScript + Vite → GitHub Pages
- **Proxy** : Deno Deploy (gère le login Laravel + CORS)

---

## 🚀 Mise en place (étape par étape)

### 1. Créer le dépôt GitHub

```bash
git init
git add .
git commit -m "init: karaoke app"
# Crée un repo sur github.com, puis :
git remote add origin https://github.com/TON_USERNAME/karaoke-app.git
git push -u origin main
```

### 2. Déployer le proxy sur Deno Deploy

1. Va sur **[dash.deno.com](https://dash.deno.com)** → **New Project**
2. Connecte ton compte GitHub
3. Sélectionne ce repo
4. Configure :
   - **Entry point** : `proxy/index.ts`
   - **Branch** : `main`
5. Clique **Deploy** → tu obtiens une URL genre `https://karaoke-proxy-xxx.deno.dev`

### 3. Configurer le secret GitHub

Dans ton repo GitHub → **Settings → Secrets and variables → Actions** :

- Crée un secret nommé **`VITE_PROXY_URL`**
- Valeur : `https://karaoke-proxy-xxx.deno.dev` (ton URL Deno)

### 4. Activer GitHub Pages

Dans ton repo GitHub → **Settings → Pages** :
- Source : **GitHub Actions**

### 5. Déclencher le premier build

```bash
git commit --allow-empty -m "trigger deploy"
git push
```

Le workflow GitHub Actions va builder et déployer automatiquement.
Ton app sera accessible sur : `https://TON_USERNAME.github.io/karaoke-app/`

---

## 🔧 Développement local

```bash
npm install
cp .env.example .env.local
# Édite .env.local avec ton URL proxy Deno
npm run dev
```

---

## 📱 Installer sur téléphone (PWA)

- **iPhone** : ouvre l'app dans Safari → partager → "Sur l'écran d'accueil"
- **Android** : ouvre dans Chrome → menu → "Ajouter à l'écran d'accueil"

---

## 🔄 Fonctionnement du Refresh

1. Clique sur **🔄 Refresh** dans l'app
2. Entre ton email/mot de passe `e-events.codewave.nc`
3. Le proxy Deno :
   - Récupère le token CSRF depuis la page d'accueil
   - POST `/login` avec tes credentials
   - GET `/search` avec les cookies de session
4. Les **nouvelles chansons** (absentes du catalogue local) sont ajoutées
5. Elles apparaissent avec un badge **new** vert
6. Tes **favoris sont préservés** (localStorage)

---

## 📁 Structure

```
karaoke-app/
├── src/
│   ├── components/      # Header, SongCard, FavPanel, ArtistSidebar, RefreshModal
│   ├── hooks/           # useSongs (état global), useVirtualList
│   ├── types/           # TypeScript interfaces
│   ├── utils/           # normalize.ts (langues)
│   ├── data/
│   │   └── songs.json   # Catalogue embarqué (18 614 chansons)
│   ├── App.tsx
│   └── main.tsx
├── proxy/
│   └── index.ts         # Proxy Deno Deploy
├── .github/workflows/
│   └── deploy.yml       # CI/CD GitHub Actions
└── public/
    └── manifest.json    # PWA manifest
```
