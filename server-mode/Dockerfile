FROM node:alpine

# Create app directory
RUN mkdir -p /usr/src/app
COPY . /usr/src/app
WORKDIR /usr/src/app

# Install pm2
RUN npm install pm2 -g

CMD ["pm2-docker", "app.js"]