# The Beidwerk website: the pages, pictures and look, served by nginx. The songs and music videos are not in the
# image: the server mounts them at /media (audio/, video/), unpacked from the media zip (see README.md).
# Contact and imprint can be changed on the server through the environment (docker-entrypoint.d/).
FROM python:3.12-alpine AS build
WORKDIR /src
COPY build.py media.json ./
COPY public public
COPY site site
RUN python build.py

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY contact.env /etc/beidwerk/contact.env
COPY --chmod=755 docker-entrypoint.d/40-beidwerk-contact.sh /docker-entrypoint.d/
COPY --from=build /src/dist /usr/share/nginx/html
LABEL org.opencontainers.image.source="https://github.com/maximedogawa/beidwerk-web" \
      org.opencontainers.image.description="The Beidwerk website"
EXPOSE 80
