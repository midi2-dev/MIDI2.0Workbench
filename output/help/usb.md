# Setup a USB UMP Device

The MIDI 2.0 Workbench has limited USB MIDI 2 Support as defined by the [USB-IF](https://www.usb.org/sites/default/files/USB%20MIDI%20v2_0.pdf).
This works for MacOS using CoreMIDI, and Linux using direct USB calls. USB MIDI 2 is not available for Windows at this stage.

Please note USB MIDI 2 and testing is new and may cause issues. Please [[report|report]] these issues.

### MacOS CoreMIDI
USB MIDI 2 Devices will display, however CoreMIDI does not have a current way to get the Group Terminal Block 
information. The MIDI 2.0 Workbench attempts to build this information from the Device Sources and Destinations, 
however this is unreliable. It is recommended that the Device also use Function Blocks to achieve a useful outcome.
Please note that the MIDI Device may need to be turned on after the MIDI 2.0 Workbench has started.

### Linux
Linux installs using Kernel 6.5 with MIDI 2 extensions and ALSA libs 1.2.10+ should have a seamless experience.

Otherwise, MIDI 2.0 Workbench talks directly to the underlying USB system. 
For the MIDI 2.0 Workbench to access USB Devices UDEV rules will need added:

```
# Please note this opens up access for any user application to have direct USB access
sudo groupadd usbusers
sudo usermod -a -G usbusers $USER
echo 'SUBSYSTEM=="usb", MODE="0666", GROUP="usbusers"' | sudo tee /etc/udev/rules.d/99-usbusers.rules
sudo udevadm control --reload
sudo udevadm trigger
```

