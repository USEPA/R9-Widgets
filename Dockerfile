FROM node:lts-alpine as node

# needed for npm dependancies
RUN apk --no-cache add git

WORKDIR /code
COPY /package.json /code/

RUN npm install

# npm not appreciating our package file and will not run audit
# TODO: fix package files so audit works
# RUN npm audit fix

COPY / /code/

RUN npm run-script build

# Stage 1, based on Nginx, to have only the compiled app, ready for production with Nginx
FROM nginx:alpine
COPY /template.nginx /etc/nginx/conf.d/snoqualmie.template
COPY --from=node /code/dist/ /usr/share/nginx/html/
