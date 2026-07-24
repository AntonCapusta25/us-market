FROM node:18-slim

# Install Docker CLI so we can trigger compose from inside
RUN apt-get update && apt-get install -y git curl \
    && curl -fsSL https://get.docker.com -o get-docker.sh \
    && sh get-docker.sh

WORKDIR /app

COPY package.json ./
RUN npm install

COPY index.js ./

EXPOSE 9000

CMD ["node", "index.js"]
