#include <nan.h>
#include <map>
#include <iostream>
#include <alsa/asoundlib.h>
#include <errno.h>

static snd_seq_t *seq;
snd_seq_client_info_t *cinfo;
snd_seq_port_info_t *pinfo;
snd_ctl_card_info_t* card_info;
int localPort;




//--------------------------------------------------------------------------------------------
//The Follow Code submitted by Florian Bomers of Bome Software to get the Product name for the UMP endpoint from USB
//
// #define ALSA_MIDI_FACTORY_PREFIX_USB_LOCATION "USB "
// // return a hierarchical representation of this device's hub/port location:
// // 1-1  --> first root controller, first device
// // 1-1.2.3 --> first root controller, first device, hub 1 port 2, hub 2 port 3.
// BString getLocation(int card, snd_ctl_card_info_t* card_info)
// {
// 	// card info: hw:0: id='SCS3d' driver='USB-Audio' name='SCS.3d'
// 	//     longname='Stanton SCS.3d at usb-ehci-platform-1.2, full speed'
// 	//     mixername='USB Mixer' components='USB0d60:7901'
// 	//   rawmidi info: hw:0,0,0: id='USB MIDI' name='SCS.3d' subname='SCS.3d MIDI 1'
// 	//   /proc/asound/SCS3d/usbbus: "001/057"
// 	//   /sys/devices/platform/ehci-platform/usb1/1-1/1-1.2/serial: "XAHD001007"
// 	// card info: hw:1,0,0: id='SCS3d_1' driver='USB-Audio' name='SCS.3d'
// 	//     longname='Stanton SCS.3d at usb-ehci-platform-1.3, full speed'
// 	//     mixername='USB Mixer' components='USB0d60:7901'
// 	//   rawmidi info: hw:1,0,0: id='USB MIDI' name='SCS.3d' subname='SCS.3d MIDI 1'
// 	//   /proc/asound/SCS3d_1/usbbus: "001/058"
// 	//   /sys/devices/platform/ehci-platform/usb1/1-1/1-1.3/serial: "XAHD001069"
// 	//
// 	// BomeBox:
// 	// # cat /proc/asound/cards
// 	// 0 [Mini           ]: USB-Audio - Launchpad Mini
// 	//					  Focusrite A.E. Ltd Launchpad Mini at usb-ci_hdrc.0-1.1, full speed
// 	// 1 [XT             ]: USB-Audio - ESI M4U XT
// 	//					  ESI Audiotechnik GmbH ESI M4U XT at usb-ci_hdrc.0-1.2, full speed
// 	// 2 [LPD8           ]: USB-Audio - LPD8
// 	//					  AKAI professional LLC LPD8 at usb-ci_hdrc.0-1.4.1, full speed
// 	// 3 [nanoKONTROL2   ]: USB-Audio - nanoKONTROL2
// 	//					  KORG INC. nanoKONTROL2 at usb-ci_hdrc.0-1.4.2, full speed
// 	// 4 [SCS3d          ]: USB-Audio - SCS.3d
// 	//					  Stanton SCS.3d at usb-ci_hdrc.0-1.3.3, full speed
// 	//
// 	// The USB location is "usb-%s-%s",dev_name,devpath
// 	// dev_name="ci_hdrc.0"
// 	// dev_path="1.3.3"
// 	//
// 	// dev_path is hierarchical: first port on root hub, port 3 on first hub, port 3 on second hub.
// 	//
// 	// this path exists:
// 	// /sys/bus/platform/devices/ci_hdrc.0/usb1/1-1/1-1.3/1-1.3.3/serial
// 	// --> but not on desktop Linux!
// 	//
// 	// Assuming that the number before - is the root hub number. 1-1.3.3 --> root hub 1 "usb1".
// 	//
// 	// This path exists on BomeBox and Desktop:
// 	// /sys/bus/usb/devices/usb1/1-1/1-1.3/1-1.3.3/serial
// 	//
// 	// # cat /proc/asound/card4/usbbus
// 	// 001/018   --> root hub number / device number
// 	// root_num=1
// 	// --> root hub is "usb1"
// 	//
// 	// now can use this simpler path:
// 	// /sys/bus/usb/devices/1-1.3.3/serial
// 	//
//
// 	// retrieve busnum from alsa info
// 	BString usbbus;
// 	usbbus.readFromFile(BString::format("/proc/asound/card%d/usbbus", card), TRUE /*firstLineOnly*/);
// 	//DG("-- usbbus ID= '%s': %s", usbbus.trim().toUTF8(), BString::toHexDump((const BByte*)usbbus.toUTF8(), usbbus.length()).toUTF8());
// 	int busnum = -1;
// 	BBool ok = usbbus.trim().parseInt(busnum, 0/*offset*/, 3/*maxlen*/);
// 	if (!ok || busnum < 1)
// 	{
// 		//DG_DISCOVERY("-- AlsaMidiFactory::getLocation(): cannot read/parse usbbus entry for card %d. usbbus=\"%s\"", card, usbbus.toUTF8());
// 		return BString::empty;
// 	}
//
// 	// parse devpath from longname
// 	BString longname(snd_ctl_card_info_get_longname(card_info));
// 	int pos = longname.indexOf("at usb-");
// 	if (pos < 1)
// 	{
// 		//DG("-- AlsaMidiFactory::getLocation(): cannot find \"at usb-\" in longname: %s", longname.toUTF8());
// 		return BString::empty;
// 	}
// 	pos += 8;
// 	pos = longname.indexOfAtOffset("-", pos);
// 	if (pos < 1)
// 	{
// 		//DG("-- AlsaMidiFactory::getLocation(): cannot find \'-\' after \"usb-\" in longname: %s", longname.toUTF8());
// 		return BString::empty;
// 	}
// 	pos++;
// 	int len = 0;
// 	while (TRUE)
// 	{
// 		char a = longname[pos + len];
// 		if (a == '.' || (a >= '0' && a <= '9'))
// 		{
// 			len++;
// 		}
// 		else
// 		{
// 			break;
// 		}
// 	}
// 	if (len == 0)
// 	{
// 		//DG("-- AlsaMidiFactory::getLocation(): cannot find devpath in longname: %s", longname.toUTF8());
// 		return BString::empty;
// 	}
// 	BString devpath(longname.substr(pos, len));
//
// 	return BString(ALSA_MIDI_FACTORY_PREFIX_USB_LOCATION) + BString::fromInt(busnum) + "-" + devpath;
// }
//
// BString AlsaMidiFactory::getManufacturer(const BString& location)
// {
// 	BString manu;
// 	if (location.startsWith(ALSA_MIDI_FACTORY_PREFIX_USB_LOCATION))
// 	{
// 		BString usbpath("/sys/bus/usb/devices/");
// 		usbpath += location.removePrefix(ALSA_MIDI_FACTORY_PREFIX_USB_LOCATION);
// 		BString manuPath = usbpath + "/manufacturer";
// 		manu.readFromFile(manuPath, TRUE /*firstLineOnly*/);
// 		//DG_DISCOVERY("  - retrieved manufacturer '%s' from: %s", manu.trim().toUTF8(), manuPath.toUTF8());
// 	}
// 	return manu.trim();
// }


//---------------------------------------------------------


NAN_METHOD(UMPSupported) {
#ifdef __ALSA_UMP_H
    info.GetReturnValue().Set(1);
#else
    info.GetReturnValue().Set(0);
#endif
}

NAN_METHOD(get_UMP_Endpoints) {
    //Nan::HandleScope scope;
  //v8::Isolate* isolate = v8::Isolate::GetCurrent();
   v8::Local <v8::Array> eps = Nan::New<v8::Array>();

#ifdef __ALSA_UMP_H
    uint8_t epFound=0;

    snd_seq_client_info_set_client(cinfo, -1);
    while (snd_seq_query_next_client(seq, cinfo) >= 0) {

      if(snd_seq_client_info_get_midi_version(cinfo) == SND_SEQ_CLIENT_LEGACY_MIDI){
          continue;
      }
      
      int client = snd_seq_client_info_get_client(cinfo);
      const char * clientName = snd_seq_client_info_get_name(cinfo);
      
      snd_seq_port_info_set_client(pinfo, client);
      snd_seq_port_info_set_port(pinfo, -1);
      
      while (snd_seq_query_next_port(seq, pinfo) >= 0) {

        uint16_t portTypeInfo = snd_seq_port_info_get_type(pinfo);


        if ((portTypeInfo &
            (SND_SEQ_PORT_TYPE_MIDI_GENERIC | SND_SEQ_PORT_TYPE_APPLICATION)
            ) || (portTypeInfo & SND_SEQ_PORT_TYPE_MIDI_UMP)==0)
          continue;
              
        std::cout << "Port "
             << portTypeInfo
             << ' '
             << snd_seq_port_info_get_client(pinfo)<< ':'
             << snd_seq_port_info_get_port(pinfo)
             << ' '
             //<< snd_seq_client_info_get_name(cinfo)
             << clientName
             << " > "
             << snd_seq_port_info_get_name(pinfo)
            <<  '\n';

        snd_ump_endpoint_info_t *ep;
        snd_ump_block_info_t *blk;
        snd_ump_endpoint_info_alloca(&ep);
        snd_ump_block_info_alloca(&blk);


        
        int errEP = snd_seq_get_ump_endpoint_info(seq, client, ep);

        

        v8::Local <v8::Object> port = Nan::New<v8::Object>();
        //int clientNum = snd_seq_port_info_get_client(pinfo);
        int portNum = snd_seq_port_info_get_port(pinfo);

//         int card = snd_seq_client_info_get_card(client);
//         if(card>=0){
//             BString hwname = BString::format("hw:%d", card);
//             snd_ctl_t* card_control_handle;
//             snd_ctl_open(&card_control_handle, hwname.toUTF8(), 0);
//             snd_ctl_card_info(card_control_handle, card_info);
//             BString location(getLocation(card, card_info));
//             BString manufacturer(getManufacturer(location));
//             Nan::Set(port,Nan::New("manufacturer").ToLocalChecked(),Nan::New(manufacturer.toUTF8()));
//         }

        Nan::Set(port,Nan::New("client").ToLocalChecked(),Nan::New(client));
        Nan::Set(port,Nan::New("port").ToLocalChecked(),Nan::New(portNum));
        
        Nan::Set(port,Nan::New("clientName").ToLocalChecked(), Nan::New(clientName).ToLocalChecked());

        Nan::Set(port,Nan::New("name").ToLocalChecked(), Nan::New(snd_ump_endpoint_info_get_name(ep)).ToLocalChecked());
        Nan::Set(port,Nan::New("productId").ToLocalChecked(), Nan::New(snd_ump_endpoint_info_get_product_id(ep)).ToLocalChecked());

        Nan::Set(port,Nan::New("flags").ToLocalChecked(),Nan::New(snd_ump_endpoint_info_get_flags(ep))); //0x2 = Static
        Nan::Set(port,Nan::New("protocolCaps").ToLocalChecked(),Nan::New(snd_ump_endpoint_info_get_protocol_caps(ep)));
        Nan::Set(port,Nan::New("version").ToLocalChecked(),Nan::New(snd_ump_endpoint_info_get_version(ep)));
        Nan::Set(port,Nan::New("manufacturerId").ToLocalChecked(),Nan::New(snd_ump_endpoint_info_get_manufacturer_id(ep)));
        Nan::Set(port,Nan::New("familyId").ToLocalChecked(),Nan::New(snd_ump_endpoint_info_get_family_id(ep)));
        Nan::Set(port,Nan::New("modelId").ToLocalChecked(),Nan::New(snd_ump_endpoint_info_get_model_id(ep)));
        Nan::Set(port,Nan::New("SWRev").ToLocalChecked(),Nan::New(snd_ump_endpoint_info_get_sw_revision(ep)));

        int num_blks = snd_ump_endpoint_info_get_num_blocks(ep);
        Nan::Set(port,Nan::New("num_blks").ToLocalChecked(),Nan::New(num_blks));
        
        v8::Local <v8::Array> blks = Nan::New<v8::Array>();
          for (int i = 0; i < num_blks; i++) {
            if (snd_seq_get_ump_block_info(seq, client, i, blk)) {
                continue;
            }
            v8::Local <v8::Object> blkO = Nan::New<v8::Object>();
            int blockId = snd_ump_block_info_get_block_id(blk);
            Nan::Set(blkO,Nan::New("blockId").ToLocalChecked(),Nan::New(blockId));
            Nan::Set(blkO,Nan::New("name").ToLocalChecked(), Nan::New(snd_ump_block_info_get_name(blk)).ToLocalChecked());
            Nan::Set(blkO,Nan::New("active").ToLocalChecked(),Nan::New(snd_ump_block_info_get_active(blk)));
            Nan::Set(blkO,Nan::New("flags").ToLocalChecked(),Nan::New(snd_ump_block_info_get_flags(blk)));
            Nan::Set(blkO,Nan::New("direction").ToLocalChecked(),Nan::New(snd_ump_block_info_get_direction(blk)));
            Nan::Set(blkO,Nan::New("firstGroup").ToLocalChecked(),Nan::New(snd_ump_block_info_get_first_group(blk)));
            Nan::Set(blkO,Nan::New("numberGroups").ToLocalChecked(),Nan::New(snd_ump_block_info_get_num_groups(blk)));
            Nan::Set(blkO,Nan::New("ciVersion").ToLocalChecked(),Nan::New(snd_ump_block_info_get_midi_ci_version(blk)));
            Nan::Set(blkO,Nan::New("syex8Streams").ToLocalChecked(),Nan::New(snd_ump_block_info_get_sysex8_streams(blk)));
            Nan::Set(blks, i, blkO);
          }
          Nan::Set(port,Nan::New("blocks").ToLocalChecked(),blks);

          Nan::Set(eps, epFound++, port);

         int err = snd_seq_connect_from(seq, localPort, client, portNum);
         snd_seq_connect_to(seq, localPort, client, portNum);
         
        // if (err < 0) std::cout << "Cannot connect from port \n";

      }
  }
#endif
  info.GetReturnValue().Set(eps);
}

NAN_METHOD(startListen) {
#ifdef __ALSA_UMP_H
    snd_seq_set_client_name(seq, "MIDI 2.0 Workbench");
    localPort = snd_seq_create_simple_port(seq, "comms",
        SND_SEQ_PORT_CAP_WRITE|SND_SEQ_PORT_CAP_SUBS_WRITE | SND_SEQ_PORT_CAP_READ | SND_SEQ_PORT_CAP_SUBS_READ, 
        0);
    
    /*std::cout << "localPort " << localPort
      << " buffsize" << snd_seq_get_output_buffer_size(seq)
      << "\n";      */
    snd_seq_set_client_midi_version(seq, 2);
    snd_seq_set_client_ump_conversion(seq,0);
    //snd_seq_nonblock(seq,1);
    //snd_seq_set_output_buffer_size(seq, 128);
#endif
}

NAN_METHOD(getEvents) {
    v8::Local <v8::Object> evOut = Nan::New<v8::Object>();

#ifdef __ALSA_UMP_H
    snd_seq_ump_event_t *ev = NULL;
    int result = snd_seq_ump_event_input(seq, &ev);
    //std::cout << "getResult " << result << " \n";


    if(result == -EAGAIN){
        info.GetReturnValue().Set(evOut);
        return;
    }
    if(result == -ENOSPC){
            info.GetReturnValue().Set(evOut);
            return;
    }

    if (snd_seq_ev_is_ump(ev)) {
        int clientNum = (int)ev->source.client;
        int portNum = (int)ev->source.port;
        Nan::Set(evOut,Nan::New("client").ToLocalChecked(),Nan::New(clientNum));
        Nan::Set(evOut,Nan::New("port").ToLocalChecked(),Nan::New(portNum));

        v8::Local <v8::Array> umpArr = Nan::New<v8::Array>();
        uint8_t umpArrC=0;
        //const unsigned int *ump;
        //ump = snd_seq_ump_ev_get_msg(ev);
	
        
        switch (ev->ump[0] >> 28){
            case 0:
            case 1:
            case 2:
            case 6:
            case 7:
                Nan::Set(umpArr, umpArrC++, Nan::New(ev->ump[0]));
                break;
            case 3: //64 bits Utility Messages
            case 4: //64 bits Utility Messages
            case 8: //64 bits Utility Messages
            case 9: //64 bits Utility Messages
            case 0xA: //64 bits Utility Messages
                Nan::Set(umpArr, umpArrC++, Nan::New(ev->ump[0]));
                Nan::Set(umpArr, umpArrC++, Nan::New(ev->ump[1]));
                break;
            case 0xB: //96 bits Utility Messages
            case 0xC: //96 bits Utility Messages
                Nan::Set(umpArr, umpArrC++, Nan::New(ev->ump[0]));
                Nan::Set(umpArr, umpArrC++, Nan::New(ev->ump[1]));
                Nan::Set(umpArr, umpArrC++, Nan::New(ev->ump[2]));
                break;
            default:
                Nan::Set(umpArr, umpArrC++, Nan::New(ev->ump[0]));
                Nan::Set(umpArr, umpArrC++, Nan::New(ev->ump[1]));
                Nan::Set(umpArr, umpArrC++, Nan::New(ev->ump[2]));
                Nan::Set(umpArr, umpArrC++, Nan::New(ev->ump[3]));
                break;
        }
        Nan::Set(evOut,Nan::New("ump").ToLocalChecked(),umpArr);
    }
#endif
    info.GetReturnValue().Set(evOut);
}

NAN_METHOD(sendUMP){

//std::cout << "Sending+"  << " \n";

    if (info.Length() < 1) {
      Nan::ThrowTypeError("Missing Client!");
      return;
    }

    if (info.Length() < 2 || !info[1]->IsArray()) {
            Nan::ThrowTypeError("Missing UMP!");
            return;
      }

    int client = Nan::To<int>(info[0]).FromJust();
    //std::cout << " - client " << client << " \n";
#ifdef __ALSA_UMP_H
    snd_seq_ump_event_t ev;
    snd_seq_ev_clear(&ev);
    snd_seq_ev_set_direct(&ev);
    snd_seq_ev_set_source(&ev, localPort );
    snd_seq_ev_set_dest(&ev, client, 0);

    v8::Local<v8::Context> context = info.GetIsolate()->GetCurrentContext();
    v8::Local<v8::Array> jsArray = v8::Local<v8::Array>::Cast(info[1]);
    int arrayLen = jsArray->Length();
    //std::cout << " - arrayLen" << arrayLen << " \n";
    //unsigned int ump[4];
    for(uint16_t i=0; i< arrayLen;i++){
        uint32_t uVal = jsArray->Get(context, i).ToLocalChecked()->Uint32Value(context).FromJust();
        ev.ump [i] = uVal;
        //std::cout << " -" << uVal << " \n";
    }
    
    ev.flags |= SND_SEQ_EVENT_UMP;
    ev.type = 0; /* not used for UMP */
    //ev.ump = ump;
    int senRes = snd_seq_ump_event_output(seq, &ev);
    //std::cout << "senRes " << senRes << " \n";


    snd_seq_drain_output(seq);
#endif
}





NAN_MODULE_INIT(Initialize) {
    snd_seq_client_info_alloca(&cinfo);
    snd_seq_port_info_alloca(&pinfo);
    snd_seq_open(&seq, "default", SND_SEQ_OPEN_DUPLEX, SND_SEQ_NONBLOCK); // Create a alsa client.

  NAN_EXPORT(target, UMPSupported);
  NAN_EXPORT(target, get_UMP_Endpoints);
  NAN_EXPORT(target, startListen);
  NAN_EXPORT(target, getEvents);
  NAN_EXPORT(target, sendUMP);

}

NODE_MODULE(ALSA, Initialize)



