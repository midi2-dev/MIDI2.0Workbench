{

  "targets": [{
    "target_name": "binding",
    "sources": [],
    "include_dirs": [
      "<!(node -e \"require('nan')\")"
    ],
    "libraries": [],
    "conditions": [
      ["OS=='win'", {
        "libraries": ["-lruntimeobject.lib"],
        "sources": [
          "_nodert_generated.cpp",
          "NodeRtUtils.cpp",
          "OpaqueWrapper.cpp",
          "CollectionsConverterUtils.cpp"
        ],
        "msvs_settings": {
          "VCCLCompilerTool": {
          "AdditionalOptions": ["/ZW"],
          "DisableSpecificWarnings": [4609],
          "AdditionalUsingDirectories": [
              "%ProgramFiles(x86)%/Windows Kits/10/UnionMetadata/10.0.22621.0",
              "$(VCToolsInstallDir)/lib/x86/store/references",
              "../lib/winmd"
            ],
            'ExceptionHandling': 1, # /EHsc,
            'RuntimeLibrary': '2', # /MD
          }
        }
      }]

    ]
  }]
}