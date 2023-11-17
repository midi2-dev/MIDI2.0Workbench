{
    "targets": [
        {
            "target_name": "CoreMIDI",
            "include_dirs" : [
 	 			"<!(node -e \"require('nan')\")"
			],
            'conditions': [
                ['OS=="mac"',
                    {
                        "sources": [ "coreMIDI/NativeExtension.cc", "coreMIDI/functions.cc" ],
                        'defines': [
                        '__MACOSX_CORE__'
                        ],
                        'xcode_settings': {
                            'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
                            'IG_OTHER_CFLAGS':["-Wunguarded-availability-new"],
                        },
                        'link_settings': {
                            'libraries': [
                                'CoreMIDI.framework',
                                'CoreAudio.framework',
                                'CoreFoundation.framework',
                            ],
                        }
                    }
                ]
            ]
        },
        {
            "target_name": "CoreMIDI2",
            "include_dirs" : [
                "<!(node -e \"require('nan')\")"
            ],
            'conditions': [
                ['OS=="mac"',
                    {
                        "sources": [ "CoreMIDI2.cc" ],
                        'defines': [
                            '__MACOSX_CORE__'
                            ],
                        'xcode_settings': {
                            'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
                            'IG_OTHER_CFLAGS':["-Wunguarded-availability-new"],
                        },
                        'link_settings': {
                            'libraries': [
                                'CoreMIDI.framework',
                                'CoreAudio.framework',
                                'CoreFoundation.framework',
                            ],
                        }
                    }
                ]
            ]
        },
        {
            "target_name": "ALSA",
            "include_dirs" : [
                "<!(node -e \"require('nan')\")"
            ],
            'conditions': [
                ['OS=="linux"',
                    {
                        "sources": [ "alsabindings.cc" ],
                        'cflags_cc!': [

                        ],
                        'defines': [
                          '__LINUX_ALSA__'
                        ],
                        'link_settings': {
                          'libraries': [
                            '-lasound',
                            '-lpthread',
                          ]
                        }
                    }
                ]
            ]
        }
    ]
}
