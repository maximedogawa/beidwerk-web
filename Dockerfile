# The Beidwerk website: the pages, pictures and look, served by nginx. The songs and music videos are not in the
# image: the server mounts them at /media (audio/, video/), unpacked from the media zip (see README.md).
# Contact and imprint can be changed on the server through the environment (docker-entrypoint.d/).
FROM python:3.12-alpine@sha256:1b668429b3511ab407d8e00648891631b0b1a4d7e15e3ca70f38ab5b91ad4ab4 AS build
WORKDIR /src
COPY build.py media.json nginx.conf ./
COPY public public
COPY site site
RUN python build.py

FROM nginx:1.29-alpine@sha256:5616878291a2eed594aee8db4dade5878cf7edcb475e59193904b198d9b830de
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY contact.env /etc/beidwerk/contact.env
COPY --chmod=755 docker-entrypoint.d/40-beidwerk-contact.sh /docker-entrypoint.d/
COPY --from=build /src/dist /usr/share/nginx/html
LABEL org.opencontainers.image.source="https://github.com/maximedogawa/beidwerk-web" \
      org.opencontainers.image.description="The Beidwerk website"
EXPOSE 80
