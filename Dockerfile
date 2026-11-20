# The Beidwerk website: the pages, pictures and look, served by nginx. The songs and music videos are not in the
# image: they live in /storage/media (audio/, video/): ONCE's volume, or the folder docker-compose.yml mounts. A media
# zip put into /storage is unpacked there when the container starts, or at once with `beidwerk-media` (README.md).
# Contact and imprint can be changed on the server through the environment (docker-entrypoint.d/).
FROM python:3.15-alpine@sha256:0f9552bb28711333da16915ec146f5e6bb44a7fdac9ced15dc17c2e0206346dd AS build
WORKDIR /src
COPY build.py media.json nginx.conf ./
COPY public public
COPY site site
RUN python build.py

FROM nginx:1.30-alpine@sha256:970364228b1e4f932abc22d321932816782cca8a20b85a77552a7cfe9acfb3b5
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY contact.env /etc/beidwerk/contact.env
COPY --chmod=755 docker-entrypoint.d/40-beidwerk-contact.sh docker-entrypoint.d/50-beidwerk-media.sh /docker-entrypoint.d/
RUN ln -s /docker-entrypoint.d/50-beidwerk-media.sh /usr/local/bin/beidwerk-media
COPY --from=build /src/dist /usr/share/nginx/html
LABEL org.opencontainers.image.source="https://github.com/maximedogawa/beidwerk-web" \
      org.opencontainers.image.description="The Beidwerk website"
EXPOSE 80
