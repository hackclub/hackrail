# hackrail!

hackrail is a ysws (you ship we ship) where you get train travel related prizes for every hour you ship on a project that uses open rail data!\
this repo contains the code for the website where everything happens. \
tech used: sqlite, drizzle,astro, html/js/css!

## running & building

### dev env

to run the website locally, you need to have nodejs/bun installed. then, run the following commands:

```bash
bun install
bun run dev
```

you also need to have a `.env` file with the following variables:

```
DATABASE_URL=<you probably want this empty>
CLIENT_SECRET=
PUBLIC_CLIENT_ID=
PUBLIC_REDIRECT_URI=
PUBLIC_HACKATIME_CLIENT_ID=
CLIENT_SECRET=
CDN_API_KEY=
PUBLIC_HACKATIME_REDIRECT_URI=
```

### prod

to run this in production, you can use the docker compose file. make sure to set the environment variables in the `.env` file, then run:

```bash
docker compose up --build
```
