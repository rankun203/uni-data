# Use the official Node.js 20 image as a parent image
FROM node:20

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the package.json and pnpm-lock.yaml files
COPY package*.json pnpm-lock.yaml* ./

# Install pnpm
RUN npm install -g pnpm

# Install project dependencies using pnpm
RUN pnpm install

# Copy the rest of your app's source code
COPY . .

# Build the app
RUN pnpm tsc

# Your app binds to port 3000. Expose this port.
EXPOSE 3000

# Define the command to run your app using CMD which defines your runtime
CMD [ "node", "dist/app.js" ]
