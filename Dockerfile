# The Beidwerk website: the pages, pictures and look, served by nginx. The songs and music videos are not in the
# image: the server mounts them at /media (audio/, video/), unpacked from the media zip (see README.md).
# Contact and imprint can be changed on the server through the environment (docker-entrypoint.d/).
FROM python:3.14-alpine@sha256:f6a589d43c42b9e7f7dc67a12d37132491f362859a5d750607710cc56da3bc72 AS build
WORKDIR /src
COPY build.py media.json nginx.conf ./
COPY public public
COPY site site
RUN python build.py

FROM nginx:1.30-alpine@sha256:970364228b1e4f932abc22d321932816782cca8a20b85a77552a7cfe9acfb3b5
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY contact.env /etc/beidwerk/contact.env
COPY --chmod=755 docker-entrypoint.d/40-beidwerk-contact.sh /docker-entrypoint.d/
COPY --from=build /src/dist /usr/share/nginx/html
LABEL org.opencontainers.image.source="https://github.com/maximedogawa/beidwerk-web" \
      org.opencontainers.image.description="The Beidwerk website"
EXPOSE 80
