# Vagrantfile for VM guest with Node.js / Electron app -*- mode: ruby -*-
# vi: set ft=ruby :

# Install per instructions from https://VagrantUp.com/.
# See various `config.vm.provider` below for fine-tuning and additional
# installation notes.
#
# USAGE:
#
# Run the following in same subdirectory/folder as this `Vagrantfile`.
#
# vagrant up
#
# It's safe to ignore the following message at run time, if it occurs at all:
# [fog][WARNING] Unrecognized arguments: libvirt_ip_command
#
# For using `rsync` to upload files from host into the virtual machine, run:
# vagrant ssh-config | sed "s/^Host default/Host vm-midi2/" |tee -a ~/.ssh/config
# After upload, your files will be in the "Home" folder when running
# the MIDI2.0 Workbench app.
# rsync -av *.midi2 vm-midi2:
#
# Log in to guest VM:
# vagrant ssh -- -X
# Then via shell inside the guest VM, run:
#   (cd MIDI2.0Workbench/ && yarnpkg run start) &
#
# When done for the day, run from host:
# vagrant suspend
#
# When permanently done, clean-up to reclaim disk/SSD space:
# vagrant destroy


# Additional steps come from "Setup a USB UMP Device" section of Help
# when running the MIDI 2.0 Workbench app and also may be found in
# midi2.dev repo: MIDI2.0Workbench/output/help/usb.md
# See also: MIDI2.0Workbench/output/help/index.md
PROVISION_DISTRO = %q[
apt-get update && apt-get dist-upgrade -y

usermod -a -G audio vagrant
groupadd usbusers
usermod -a -G usbusers vagrant
echo 'SUBSYSTEM=="usb", MODE="0666", GROUP="usbusers"' > /etc/udev/rules.d/99-usbusers.rules
udevadm control --reload
udevadm trigger
]

# If using the VM host software's graphical console instead of X via SSH,
# add to the set of packages to be installed: xorg xfce4
# However, initial setup and future updates will take *much* longer.
PROVISION_DEPENDENCIES = %q[
apt-get install -y \
  nodejs curl git libasound2-dev python3 yarnpkg bzip2 make g++ \
  libnss3 libatk1.0-dev libatk-bridge2.0-dev libcups2-dev \
  libdrm-dev libgtk-3-dev libudev-dev zstd upower xauth rsync jq
]

# Node.js v24 is latest as of 2025-07-21.
# Node.js v20 is Maintenance LTS, v22 is Active LTS.
# https://nodejs.org/en/about/previous-releases
# https://endoflife.date/nvm
PROVISION_NODEJS = %q[
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 20
nvm use 20
echo Done.
]

# If shared folders are enabled and available, use the local clone
# from git repo; otherwise, clone it within VM.
GIT_CLONE = %q[
if [ $(grep -c MIDI2.0Workbench /vagrant/.git/config) ]; then
  ln -s /vagrant MIDI2.0Workbench
else
  git clone https://github.com/midi2-dev/MIDI2.0Workbench.git
fi
]

# TODO resolve newer dependencies upstream
PATCH_APP = %q[
cd MIDI2.0Workbench/

sed -i 's%"node-gyp": "8.4.1"%"cmake-js": "^6.0.0"%' package.json
sed -i 's%"\*\*/node-gyp": "8.4.1"%"**/cmake-js": "^6.0.0"%' package.json
sed -i 's%"glob": "^7.1.7"%"glob": "11.0.3"%' package.json
sed -i 's%"\*\*/automation-events": "4.0.14"%"**/automation-events": "^7.0.9"%' package.json
sed -i 's%"electron": "^19.1.9"%"electron": "^37.2.3"%' package.json
sed -i 's%"electron-builder": "23.6.0"%"electron-builder": "^26.0.12"%' package.json

mv package.json package.json~
jq 'del(.build.linux.desktop)' < package.json~ > package.json
]

# TODO resolve nested dependency that requires node-gyp.
BUILD_APP = %q[
cd MIDI2.0Workbench/ && \
source ~/.nvm/nvm.sh && \
nvm use 20 && \
yarnpkg && \
yarnpkg add node-gyp && \
yarnpkg upgrade && \
yarnpkg run build && \
sudo chown root:root ./node_modules/electron/dist/chrome-sandbox && \
sudo chmod 4755 ./node_modules/electron/dist/chrome-sandbox && \
sudo chown root:root ./dist/linux-unpacked/chrome-sandbox && \
sudo chmod 4755 ./dist/linux-unpacked/chrome-sandbox && \
echo Done.
]

MOTD = %q[
Since this is an Electron UI app, log in via `vagrant ssh -- -X`
and then run:

 (cd MIDI2.0Workbench/ && yarnpkg run start) &

Select "SMF2" from upper right of main window.
].gsub(/\n/,"\\n")

UPDATE_MOTD = %Q[
echo -e "\n#{MOTD}\n" > /etc/motd
]

Vagrant.configure("2") do |config|
  config.vm.box = "debian/bookworm64" # Debian 12

  # Must run `vagrant box outdated` to get updates when false:
  config.vm.box_check_update = false

  # When enabled, VM stalls under libvirt on some Debian 12 based distros
  # with message indicating that it's mounting shared folders.
  config.vm.synced_folder ".", "/vagrant", disabled: true

  config.vm.provision "shell",
                      inline: PROVISION_DISTRO,
                      name: "PROVISION_DISTRO",
                      env: {DEBIAN_FRONTEND: "noninteractive"},
                      reboot: true

  config.vm.provision "shell",
                      inline: PROVISION_DEPENDENCIES,
                      name: "PROVISION_DEPENDENCIES",
                      env: {DEBIAN_FRONTEND: "noninteractive"}

  config.vm.provision "shell",
                      inline: PROVISION_NODEJS,
                      name: "PROVISION_NODEJS",
                      privileged: false

  config.vm.provision "shell",
                      inline: GIT_CLONE,
                      name: "GIT_CLONE",
                      privileged: false

  config.vm.provision "shell",
                      inline: PATCH_APP,
                      name: "Patch",
                      privileged: false

  config.vm.provision "shell",
                      inline: BUILD_APP,
                      name: "BUILD_APP",
                      privileged: false

  config.vm.provision "shell",
                      inline: UPDATE_MOTD,
                      name: "UPDATE_MOTD"

  config.vm.provision "shell",
                      inline: "",
                      name: "Log in via: vagrant ssh -- -X",
                      privileged: false,
                      run: "always"

  config.vm.provision "shell",
                      inline: "",
                      name: "Then: (cd MIDI2.0Workbench/ && yarnpkg run start) &",
                      privileged: false,
                      run: "always"

  # See: https://LibVirt.org
  # Install on newer Macs with ARM processors (M1,M2,M4,etc.)
  #  brew install libvirt
  #  brew install --cask xquartz
  #  brew install --cask vagrant
  # Install on Debian 12 based Linux distributions such as AV or MX Linux via:
  #  sudo apt install qemu-system qemu-utils libvirt-daemon-system libvirt-dev
  # Then, run:
  #  vagrant up --provider=libvirt
  # May need to uncomment this `plugins` line:
  config.vagrant.plugins = "vagrant-libvirt"
  config.vm.provider :libvirt do |virt|
    virt.driver = "kvm"
    virt.uri = 'qemu:///system'
    virt.cpus = 4
    virt.memory = 2048
    #virt.ssh_port = "2222"
  end

  # Default settings for vagrant-qemu plugin will not work for Apple Mac
  # ARM-based M1,M2,M4,etc. when hosting Intel-based images.
  # Install on macos:
  #  brew install qemu
  #  brew install --cask xquartz
  #  brew install --cask vagrant
  #  vagrant plugin install vagrant-qemu
  # Run:
  #  vagrant up --provider=qemu
  # May need to uncomment this `plugins` line:
  #config.vagrant.plugins = "vagrant-qemu"
  config.vm.provider "qemu" do |q|
    q.arch = "x86_64"
    q.machine = "q35"
    q.cpu = "max"
    #q.cpus = 4
    #q.memory = 2048
    q.net_device = "virtio-net-pci"
    #q.ssh_port = "50022"
  end

  # See: https://VirtualBox.org
  # Remember that Virtualbox is owned by Oracle (SQL db company),
  # and they tend to be very strict when enforcing their license.
  # Be sure to read and comprehend their Terms & Conditions
  # especially if your usage is under the employ of a company.
  # Double check with IT department and management before use.
  # Comment-out all `config.vagrant.plugins` lines in this file.
  # Run: vagrant up --provider=virtualbox
  config.vm.provider :virtualbox do |vbox|
      vbox.cpus = 4
      vbox.memory = 2048
      #vbox.ssh_port = "2222"
  end
end
