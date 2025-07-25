# Run MIDI 2.0 Workbench Electron app within Docker container. -*-conf-*-
#
# docker build -t midi20workbench .
# xhost local:docker
# docker run \
#  --user="$(id --user):$(id --group)" \
#  -e DISPLAY \
#  -v /tmp/.X11-unix:/tmp/.X11-unix \
#  -v $HOME/Documents:/home/node/Documents \
#  -it --rm midi20workbench
#
# Optional, while that container is running, extract Linux AppImage:
# CONTAINER=$(docker ps -q | awk '{print $1}')
# docker cp \
#  $CONTAINER:/home/node/MIDI2.0Workbench/dist/midi2workbench-1.6.0-p.AppImage \
#  ~/Downloads/

FROM node:24-bookworm-slim

# TODO Node.js v24 is latest as of 2025-07-21.
# Node.js v20 is Maintenance LTS, and v22 is Active LTS.
# https://nodejs.org/en/about/previous-releases
# However, midi2.dev instructs keeping with 16 because of c++ plugins
# but that version crashes due to being too old for "node-addon-api"
# plus other issues which require 18 or newer.
#
# Changing this value should also update `FROM` line above.
ARG NODE_VERSION=24

ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get dist-upgrade -y
RUN apt-get install -y \
  nodejs curl git libasound2-dev python3 yarnpkg bzip2 make g++ \
  libnss3 libatk1.0-dev libatk-bridge2.0-dev libcups2-dev \
  libdrm-dev libgtk-3-dev libudev-dev zstd upower xauth rsync jq

# Beware: adding `node` user to groups within Dockerfile is useless.
# According to https://docs.docker.com/reference/dockerfile/#user,
# "Any other configured group memberships will be ignored."
#
# Thus if needing additional steps from "Setup a USB UMP Device" section of Help
# in MIDI2.0Workbench/output/help/usb.md, MIDI2.0Workbench/output/help/index.md,
# use a guest VM instead.  See: Vagrantfile
#
# RUN usermod -a -G audio node
# RUN groupadd usbusers
# RUN usermod -a -G usbusers node
# RUN echo 'SUBSYSTEM=="usb", MODE="0666", GROUP="usbusers"' > /etc/udev/rules.d/99-usbusers.rules
# RUN udevadm control --reload
# RUN udevadm trigger

# TODO package.json has a hard-coded path, /home/andrew
RUN ln -s /home/node /home/andrew

USER node

WORKDIR /home/node

ENV NVM_DIR=/home/node/.nvm

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
RUN bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use $NODE_VERSION"

# RUN git clone https://github.com/midi2-dev/MIDI2.0Workbench.git
RUN mkdir MIDI2.0Workbench
WORKDIR MIDI2.0Workbench

COPY ./ ./
COPY --chown=node:node . .

# TODO resolve newer dependencies upstream
RUN sed -i 's%"node-gyp": "8.4.1"%"cmake-js": "^6.0.0"%' package.json
RUN sed -i 's%"\*\*/node-gyp": "8.4.1"%"**/cmake-js": "^6.0.0"%' package.json
RUN sed -i 's%"glob": "^7.1.7"%"glob": "11.0.3"%' package.json
RUN sed -i 's%"\*\*/automation-events": "4.0.14"%"**/automation-events": "^7.0.9"%' package.json
RUN sed -i 's%"electron": "^19.1.9"%"electron": "^37.2.3"%' package.json
RUN sed -i 's%"electron-builder": "23.6.0"%"electron-builder": "^26.0.12"%' package.json

RUN mv package.json package.json~
RUN jq 'del(.build.linux.desktop)' < package.json~ > package.json

# TODO resolve nested dependency that requires node-gyp.
RUN bash -c "source $NVM_DIR/nvm.sh && \
    nvm use $NODE_VERSION && \
    yarnpkg && \
    yarnpkg add node-gyp && \
    yarnpkg upgrade && \
    yarnpkg run build"

USER root
RUN chown root:root ./node_modules/electron/dist/chrome-sandbox && \
    chmod 4755 ./node_modules/electron/dist/chrome-sandbox && \
    chown root:root ./dist/linux-unpacked/chrome-sandbox && \
    chmod 4755 ./dist/linux-unpacked/chrome-sandbox

USER node

# For uploading .midi2 files, keep this path in sync with -v CLI param.
RUN test -d /home/node/Documents || mkdir -p /home/node/Documents

CMD ["yarnpkg", "run", "start"]
