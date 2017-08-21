// GeckoPrefsExporter: Exports prefs from Gecko-based applications
//
// This must run in app/browser context in order to read prefs.  You may have
// to "Enable browser chrome and add-on debugging toolboxes" in the Developer
// Toolbox Options, and in Scratchpad select Browser in the Environment menu.
// You can change those settings back to what they were when you are done.

"use strict";

// The default options will suffice for basic use.  You can adjust these to
// optimize the output for specific tasks and work flows.
var options = {
  exportFormat:         "txt",           // "txt", "csv", "js", "json"
  showResultsDialog:    false,           // Always show results dialog with stats?
  performFileSave:      true,            // In case you only want to see stats
  useFilePicker:        true,            // Use file picker or save to desktop?
  addToRecentDocs:      false,           // A file picker option
  filename: {
    base:               "ExportedPrefs", // Base portion of filename
    reflectsApp:        true,            // Prepend app info to base?
    reflectsFiltering:  true,            // Append -Filtered to base when filtering?
  },
  txt: {
    separator:          " • ",           // Separator between fields
    appendStats:        false,           // Append stats to output?
  },
  txtCsv: {
    outputPrefName:     true,            // Output pref name field?
    outputPrefStatus:   true,            // Output pref status field?
    outputPrefType:     true,            // Output pref type field?
    outputPrefValue:    true,            // Output pref value field?
    outputPrefDefValue: true,            // Output pref default value field?
    outputHeader:       true,            // Output header with field descriptions?
  },
  js: {
    funcName:           "user_pref",     // Function name for pref calls
    useDefValue:        false,           // Use default value instead of user value?
    includeWarning:     true,            // Warning about function call use?
  },
  txtCsvJs: {
    endOfLine:          "\r\n",          // Line terminator
  },
  outputStr: {
    prefNameHdr:        "<PREFNAME>",       // Pref name header field
    prefStatusHdr:      "<STATUS>",         // Pref status header field
    prefTypeHdr:        "<TYPE>",           // Pref type header field
    prefValueHdr:       "<VALUE>",          // Pref value header field
    prefDefValueHdr:    "<DEFAULTVALUE>",   // Pref default value header field
    statusLocked:       "locked",           // Shows pref is locked
    statusDefault:      "default",          // Shows pref has default value
    statusNotDefault:   "userset",          // Shows pref has non default value
    typeInteger:        "integer",          // Shows pref is integer type
    typeBoolean:        "boolean",          // Shows pref is boolean type
    typeString:         "string",           // Shows pref is string type
    typeInvalid:        "<TYPE_INVALID>",   // Shows pref has an invalid type
    typeUnknown:        "<TYPE_UNKNOWN>",   // Shows pref has no known type
    noDefValue:         "<NODEFAULTVALUE>", // Used when there is no default value
    error:              "<ERROR>",          // Would appear if code is broken
  },
  misc: {
    prefRoot:           "",              // Can be adjusted to export sub-branches
    caseSensitiveSort:  true,            // Determines pref output order
    logNonAsciiChars:   false,           // Log non-ASCII prefs to console?
  },
  prefilter: {
    status: {
      incUserset:       true,            // Include prefs with status userset?
      incDefault:       true,            // Include prefs with status default?
      incLocked:        true,            // Include prefs with status locked?
    },
    type: {
      incBoolean:       true,            // Include prefs with type boolean?
      incInteger:       true,            // Include prefs with type integer?
      incString:        true,            // Include prefs with type string?
      incInvalid:       true,            // Include prefs with type invalid?
      incUnknown:       true,            // Include prefs with type unknown?
    },
  },
  filter: {
    include:            undefined,       // Include if matched
    exclude:            undefined,       // Exclude if matched (priority)
    reMatchPrefName:    true,            // Apply RegExps to pref name
    reMatchPrefValue:   true,            // Apply RegExps to pref value
    debug:              false,           // In case of trouble with filtering
  },
};

// Nothing else to adjust, hopefully!
var gpe = {
  name:    "GeckoPrefsExporter",
  version: "1",
  desc:    "GeckoPrefsExporter v1",
  prefix:  "[GPE] ",
};
var prefs = [];
var stats = {
  // Before filtering
  numPrefs            : 0,
  numUsersetPrefs     : 0,
  numDefaultPrefs     : 0,
  numLockedPrefs      : 0,
  numBooleanPrefs     : 0,
  numIntegerPrefs     : 0,
  numStringPrefs      : 0,
  numLocalizedPrefs   : 0,
  numNonAsciiPrefs    : 0,
  numNonExtAsciiPrefs : 0,
  numHighCodePtPrefs  : 0,
  numInvalidTypes     : 0,
  numUnknownTypes     : 0,
  numUserValues       : 0,
  numDefValues        : 0,
  maxPrefNameLen      : 0,
  maxUserValueLen     : 0,
  maxDefValueLen      : 0,
  // After filtering
  numIncByPrefilter   : 0,
  numExcByPrefilter   : 0,
  incFilterMatches    : 0,
  excFilterMatches    : 0,
  numPrefsForExport   : 0,
};
var statsTableWidth = 27;
var output = "";

// ToDo: Structure & line lengths
startup();
getPrefs();
if(options.performFileSave) {
  prepareOutput();
  saveOutput(showResultsAndShutdown);
}
else showResultsAndShutdown("File save disabled by options");


// Functions
function startup() {
  // Verify that required components are available
  if(typeof(Components) !== "object") {
    fatalError("Components is not an object.  Are you running in browser context?", false);
  }
  ["interfaces", "classes", "utils", "results"].forEach(function(p) {
    if(typeof(Components[p]) !== "object") {
      fatalError("Components." + p + " is not an object.  Are you running in browser context?", false);
    }
  });
  if(typeof(Services) === "undefined") {
    log("Services is undefined.  Importing...");
    Components.utils.import("resource://gre/modules/Services.jsm");
    if(typeof(Services) !== "object") {
      fatalError("Can't import resource://gre/modules/Services.jsm", false);
    }
  }
  if(typeof(FileUtils) === "undefined") {
    log("FileUtils is undefined.  Importing...");
    Components.utils.import("resource://gre/modules/FileUtils.jsm");
    if(typeof(FileUtils) !== "object") {
      fatalError("resource://gre/modules/FileUtils.jsm", true);
    }
  }
  log(gpe.desc + " Started");
}

function shutdown() {
  log("Finished");
}

function showResultsAndShutdown(resultMsg) {
  Object.keys(stats).forEach(function(key) {
    log(getNameValueRow(key, stats[key], statsTableWidth));
  });
  log(resultMsg);
  if(options.showResultsDialog) {
    var text = resultMsg + "\n\n";
    Object.keys(stats).forEach(function(key) {
      text += key + ":  " + stats[key] + "\n";
    });
    text += "\n";
    Services.prompt.alert(null, gpe.name, text);
  }
  shutdown();
}

function saveOutput(cbShowResultsAndShutdown) {
  var outputFilename = getFilename(options);
  if((typeof(window) !== "undefined") && options.useFilePicker) {
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
    fp.init(window, "Save " + gpe.name + " Save File As", fp.modeSave);
    fp.addToRecentDocs = options.addToRecentDocs;
    fp.defaultString = outputFilename;
    fp.defaultExtension = options.exportFormat;
    fp.appendFilter(options.exportFormat.toUpperCase() + " Files", "*." + options.exportFormat);
    fp.appendFilters(fp.filterAll);
    var fpCallbackObj = {
      done: function(result) {
        if(result != fp.returnCancel) {
          if(writeFile(fp.file, output)) {
            cbShowResultsAndShutdown("Export successful");
          }
          else {
            cbShowResultsAndShutdown("Export failed");
          }
        }
        else {
          cbShowResultsAndShutdown("Export cancelled");
        }
      }
    };
    fp.open(fpCallbackObj);
  }
  else {
    var file = Services.dirsvc.get("Desk", Components.interfaces.nsIFile);
    file.append(outputFilename);
    var text = "\nSave to " + file.path + "?\n\n";
    if(Services.prompt.confirm(null, gpe.name, text) === true) {
      if(writeFile(file, output)) {
        cbShowResultsAndShutdown("Export successful");
      }
      else {
        cbShowResultsAndShutdown("Export failed");
      }
    }
    else {
      cbShowResultsAndShutdown("Export cancelled");
    }
  }
}

function getPrefs() {
  // ToDo: Revisit use of and comparisons of both branches
  var defBranch = Services.prefs.getDefaultBranch(options.misc.prefRoot);
  var defPrefNames = defBranch.getChildList("");
  var userBranch = Services.prefs.getBranch(options.misc.prefRoot);
  var prefNames = userBranch.getChildList("");
  if(options.misc.caseSensitiveSort) {
    defPrefNames.sort();
    prefNames.sort();
  }
  else {
    defPrefNames.sort(caseInsensitiveSort);
    prefNames.sort(caseInsensitiveSort);
  }
  // Verify that pref names and types are the same on both User and Default branches
  if(prefNames.length !== defPrefNames.length) {
    fatalError("Pref count mismatch: " + [prefNames.length, defPrefNames.length].join(", "), true);
  }
  prefNames.forEach(function(element, index) {
    var prefType = userBranch.getPrefType(element);
    var defPrefType = defBranch.getPrefType(element);
    if((element !== defPrefNames[index]) || (prefType != defPrefType)) {
      fatalError("Pref name or type mismatch: " + [element, prefType, defPrefNames[index], defPrefType].join(", "), true);
    }
  });
  // Init stats where necessary
  if(!options.filter.include) {
    stats.incFilterMatches = "N/A";
  }
  if(!options.filter.exclude) {
    stats.excFilterMatches = "N/A";
  }
  // Compile pref information.  The representation should be consistent with that
  // presented by about:config, but include additional information where possible.
  // https://dxr.mozilla.org/mozilla-release/source/toolkit/components/viewconfig/content/config.js
  prefNames.forEach(function(prefName) {
    var pref = {
      name:     options.outputStr.error,
      status:   options.outputStr.error,
      type:     options.outputStr.error,
      value:    options.outputStr.error,
      defValue: options.outputStr.error,
    };
    pref.name = prefName;
    if(pref.name.length > stats.maxPrefNameLen) {
      stats.maxPrefNameLen = pref.name.length;
    }
    stats.numPrefs++;
    if(userBranch.prefIsLocked(pref.name)) {
      pref.status = options.outputStr.statusLocked;
      stats.numLockedPrefs++;
    }
    else if(userBranch.prefHasUserValue(pref.name)) {
      pref.status = options.outputStr.statusNotDefault;
      stats.numUsersetPrefs++;
    }
    else {
      pref.status = options.outputStr.statusDefault;
      stats.numDefaultPrefs++;
    }
    var prefType = userBranch.getPrefType(pref.name);
    switch(prefType) {
      case userBranch.PREF_BOOL:
        pref.type = options.outputStr.typeBoolean;
        stats.numBooleanPrefs++;
        pref.value = userBranch.getBoolPref(pref.name);
        stats.numUserValues++;
        try {
          pref.defValue = defBranch.getBoolPref(pref.name);
          stats.numDefValues++;
        }
        catch(e) {
          pref.defValue = options.outputStr.noDefValue;
        }
        break;
      case userBranch.PREF_INT:
        pref.type = options.outputStr.typeInteger;
        stats.numIntegerPrefs++;
        pref.value = userBranch.getIntPref(pref.name);
        stats.numUserValues++;
        try {
          pref.defValue = defBranch.getIntPref(pref.name);
          stats.numDefValues++;
        }
        catch(e) {
          pref.defValue = options.outputStr.noDefValue;
        }
        break;
      case userBranch.PREF_STRING:
        pref.type = options.outputStr.typeString;
        stats.numStringPrefs++;
        // ToDo: branch.getCharPref vs Services.prefs.getStringPref
        //       nsIPrefBranch should have methods to get/set unicode strings
        //       https://bugzilla.mozilla.org/show_bug.cgi?id=1345294
        pref.value = userBranch.getComplexValue(pref.name, Components.interfaces.nsISupportsString).data;
        stats.numUserValues++;
        if((pref.status == "default") && (/^chrome:\/\/.+\/locale\/.+\.properties/.test(pref.value))) {
          try {
            pref.value = userBranch.getComplexValue(pref.name, Components.interfaces.nsIPrefLocalizedString).data;
            stats.numLocalizedPrefs++;
          }
          catch(e) {
            // Covered
          }
        }
        if(pref.value.length > stats.maxUserValueLen) {
          stats.maxUserValueLen = pref.value.length;
        }
        // ToDo: Keep?
        var isNonAscii = false;
        var isNonExtAscii = false;
        var isHighCodePt = false;
        for(var i=0; i<pref.value.length; i++) {
          var codePoint = pref.value.codePointAt(i);
          if(codePoint  > 127) {
            isNonAscii = true;
          }
          if(codePoint > 255) {
            isNonExtAscii = true;
          }
          if(codePoint > 0xFFFF) {
            isHighCodePt = true;
          }
        }
        if(isNonAscii) {
          stats.numNonAsciiPrefs++;
          if(isNonExtAscii) {
            stats.numNonExtAsciiPrefs++;
            if(isHighCodePt) {
              stats.numHighCodePtPrefs++;
            }
          }
          if(options.misc.logNonAsciiChars) {
            log("Non-Ascii: " + pref.name + " : " + pref.value);
          }
        }
        try {
          pref.defValue = defBranch.getComplexValue(pref.name, Components.interfaces.nsISupportsString).data;
          stats.numDefValues++;
          if(pref.defValue.length > stats.maxDefValueLen) {
            stats.maxDefValueLen = pref.defValue.length;
          }
        }
        catch(e) {
          pref.defValue = options.outputStr.noDefValue;
        }
        break;
      case userBranch.PREF_INVALID:
        log("Invalid pref type found for " + pref.name);
        pref.type = options.outputStr.typeInvalid;
        pref.value = options.outputStr.typeInvalid;
        pref.defValue = options.outputStr.typeInvalid;
        stats.numInvalidTypes++;
        break;
      default:
        log("Unknown pref type (" + prefType + ") found for " + pref.name);
        pref.type = options.outputStr.typeUnknown,
        pref.value = options.outputStr.typeUnknown,
        pref.defValue = options.outputStr.typeUnknown,
        stats.numUnknownTypes++;
        break;
    }
    // Filtering
    if(prefPassesPrefilters(pref, options.prefilter, stats)) {
      if(prefPassesFilters(pref, options.filter, stats)) {
        prefs.push(pref);
        stats.numPrefsForExport++;
      }
    }
  });
}

function prefPassesPrefilters(pref, prefilter, stats) {
  var included = true;
  if(((pref.status === "userset") && !prefilter.status.incUserset) ||
     ((pref.status === "default") && !prefilter.status.incDefault) ||
     ((pref.status === "locked") && !prefilter.status.incLocked) ||
     ((pref.type === "boolean") && !prefilter.type.incBoolean) ||
     ((pref.type === "integer") && !prefilter.type.incInteger) ||
     ((pref.type === "string") && !prefilter.type.incString) ||
     ((pref.type === options.outputStr.typeInvalid) && !prefilter.type.invalid) ||
     ((pref.type === options.outputStr.typeUnknown) && !prefilter.type.unknown)) {
    included = false;
    stats.numExcByPrefilter++;
  }
  else {
    stats.numIncByPrefilter++;
  }
  return(included);
}

function prefPassesFilters(pref, filter, stats) {
  var included = true;
  if(filter.include) {
    included = false;
    if(filter.include instanceof RegExp) {
      if(filter.reMatchPrefName) {
        if(filter.include.test(pref.name)) {
          included = true;
          stats.incFilterMatches++;
          if(filter.debug) {
            console.log(pref.name + " name matched include regex");
          }
        }
      }
      if(!included && filter.reMatchPrefValue) {
        if(filter.include.test(pref.value.toString())) {
          included = true;
          stats.incFilterMatches++;
          if(filter.debug) {
            console.log(pref.name + " value matched include regex");
          }

        }
      }
    }
    else if(Array.isArray(filter.include)) {
      // Case sensitive array of pref names to include
      if(filter.include.indexOf(pref.name) != -1) {
        included = true;
        stats.incFilterMatches++;
        if(filter.debug) {
          console.log(pref.name + " name matched include array");
        }
      }
    }
    else if(typeof(filter.include) === "function") {
      // Function which returns true to include
      if(filter.include(pref)) {
        included = true;
        stats.incFilterMatches++;
        if(filter.debug) {
          console.log(pref.name + " matched include function");
        }
      }
    }
    else fatalError("Invalid include filter", true);
  }
  if(filter.exclude) {
    if(included) {
      if(filter.exclude instanceof RegExp) {
        if(filter.reMatchPrefName) {
          if(filter.exclude.test(pref.name)) {
            included = false;
            stats.excFilterMatches++;
            if(filter.debug) {
              console.log(pref.name + " name matched exclude regex");
            }
          }
        }
        if(included && filter.reMatchPrefValue) {
          if(filter.exclude.test(pref.value.toString())) {
            included = false;
            stats.excFilterMatches++;
            if(filter.debug) {
              console.log(pref.name + " value matched exclude regex");
            }
          }
        }
      }
      else if(Array.isArray(filter.exclude)) {
        // Case sensitive array of pref names to exclude
        if(filter.exclude.indexOf(pref.name) != -1) {
          included = false;
          stats.excFilterMatches++;
          if(filter.debug) {
            console.log(pref.name + " name matched exclude array");
          }
        }
      }
      else if(typeof(filter.exclude) === "function") {
        // Function which returns true to exclude
        if(filter.exclude(pref)) {
          included = false;
          stats.excFilterMatches++;
          if(filter.debug) {
            console.log(pref.name + " matched exclude function");
          }
        }
      }
      else fatalError("Invalid exclude filter", true);
    }
  }
  return(included);
}

function prepareOutput() {
  if(options.exportFormat === "json") {
    output = JSON.stringify(prefs);
    // Not strictly necessary, but why not verify this before export
    if(!jsonOutputParseMatchesPrefs(output, prefs)) {
      fatalError("JSON.parse of output won't match prefs", true);
    }
  }
  else if((options.exportFormat === "txt") || (options.exportFormat === "csv")) {
    var separator = (options.exportFormat === "txt") ? options.txt.separator : ",";
    if(options.txtCsv.outputHeader) {
      var fields = [];
      if(options.txtCsv.outputPrefName) {
        fields.push(options.outputStr.prefNameHdr);
      }
      if(options.txtCsv.outputPrefStatus) {
        fields.push(options.outputStr.prefStatusHdr);
      }
      if(options.txtCsv.outputPrefType) {
        fields.push(options.outputStr.prefTypeHdr);
      }
      if(options.txtCsv.outputPrefValue) {
        fields.push(options.outputStr.prefValueHdr);
      }
      if(options.txtCsv.outputPrefDefValue) {
        fields.push(options.outputStr.prefDefValueHdr);
      }
      if(options.exportFormat === "csv") {
        fields.forEach(function(f, i) {
          fields[i] = csvConvert(f);
        });
      }
      output += fields.join(separator) + options.txtCsvJs.endOfLine;
    }
    prefs.forEach(function(pref, index) {
      var fields = [];
      if(options.txtCsv.outputPrefName) {
        fields.push(pref.name);
      }
      if(options.txtCsv.outputPrefStatus) {
        fields.push(pref.status);
      }
      if(options.txtCsv.outputPrefType) {
        fields.push(pref.type);
      }
      if(options.txtCsv.outputPrefValue) {
        if(typeof(pref.value) === "string") {
          fields.push(escMatchingChars(pref.value, /[\x00-\x1f\x7f\u2028\u2029]/g));
        }
        else fields.push(pref.value);
      }
      if(options.txtCsv.outputPrefDefValue) {
        if(typeof(pref.defValue) === "string") {
          fields.push(escMatchingChars(pref.defValue, /[\x00-\x1f\x7f\u2028\u2029]/g));
        }
        else fields.push(pref.defValue);
      }
      if(options.exportFormat === "csv") {
        // Unusually long pref fields (which some extensions have made possible)
        // can lead to the creation of a csv field that will exceed the maximum
        // number of characters allowed by some csv processing applications.  I
        // see 32,767 chars mentioned for Excel, and 50,000 chars mentioned for
        // Google Sheets.
        fields.forEach(function(f, i) {
          fields[i] = csvConvert(f);
        });
      }
      output += fields.join(separator) + options.txtCsvJs.endOfLine;
    });
    if((options.exportFormat === "txt") && options.txt.appendStats) {
      output += "\n\n" + gpe.name + " stats:\n\n";
      Object.keys(stats).forEach(function(key) {
        output += getNameValueRow(key, stats[key], statsTableWidth) + "\n";
      });
      output += "\n";
    }
  }
  else if(options.exportFormat === "js") {
    if(options.js.includeWarning) {
      ["// WARNING: These lines are in function call format just to making",
       "// comparisons easier.  Some of the function calls that can appear",
       "// here will not be safe to execute in a Gecko application via",
       "// prefs.js, user.js, or the like.  Be careful how you use this."
      ].forEach(function(line) {
        output += line + options.txtCsvJs.endOfLine;
      });
    }
    prefs.forEach(function(pref, index) {
        var value = options.js.useDefValue ? pref.defValue : pref.value;
        output += options.js.funcName + '("' + pref.name + '", ';
        if(typeof(value) === "string") {
          if(pref.name === "network.IDN.blacklist_chars") {
            value = unicodeEscAllChars(value);
          }
          else value = escMatchingChars(value, /[\x00-\x1f\x7f\"\\\u2028\u2029]/g);
          output += '"' + value + '");' + options.txtCsvJs.endOfLine;
        }
        else output += value + ');' + options.txtCsvJs.endOfLine;
    });
  }
  else {
    fatalError("Invalid exportFormat", true);
  }
  return(output);
}

function escMatchingChars(str, regex) {
  return str.replace(regex, function (character) {
    var rep;
    switch (character) {
      case "\b":
        rep = "\\b";
        break;
      case "\t":
        rep = "\\t";
        break;
      case "\n":
        rep = "\\n";
        break;
      case "\v":
        rep = "\\v";
        break;
      case "\f":
        rep = "\\f";
        break;
      case "\r":
        rep = "\\r";
        break;
      case "\u2028":
        rep = "\\u2028";
        break;
      case "\u2029":
        rep = "\\u2029";
        break;
      default:
        var cc = character.charCodeAt(0);
        if((cc < 32) || (cc == 127)) {
          rep = "\\u" + ("000" + cc.toString(16).toUpperCase()).substr(-4);
        }
        else rep = "\\" + character;
        break;
    }
    return(rep);
  });
}

function csvConvert(field) {
  return('"' + field.toString().replace(/\"/g, '""').replace(/\,/g, "\\,") + '"');
}

function unicodeEscAllChars(str) {
  // Assumes code point <= 0xffff
  var result = "";
  for(var i=0; i<str.length; i++){
    result += "\\u" + ("000" + str[i].charCodeAt(0).toString(16).toUpperCase()).substr(-4);
  }
  return(result);
}

function jsonOutputParseMatchesPrefs(jsonStringifiedPrefs, prefs) {
  var result = false;
  var msgPref = "JSON.parse check failed: ";
  var cmpPrefs = JSON.parse(jsonStringifiedPrefs);
  if(prefs.length !== cmpPrefs.length) {
    log(msgPref + "prefs.length != cmpPrefs.length");
  }
  else {
    result = prefs.every(function(pref, index) {
      var cmpPref = cmpPrefs[index];
      var prefKeys = Object.keys(pref);
      var cmpPrefKeys = Object.keys(cmpPref);
      if(prefKeys.length !== cmpPrefKeys.length) {
        log(msgPref + "keys different for " + pref.name);
        return(false);
      }
      else {
        return(prefKeys.every(function(key) {
          if(pref[key] !== cmpPref[key]) {
            log(msgPref + "pref mismatch for " + [pref.name, key, pref[key], cmpPref[key]].join(", "));
            return(false);
          }
          return(true);
        }));
      }
    });
  }
  return(result);
}

function getFilename(options) {
  var filename = options.filename.base;
  if(options.filename.reflectsApp) {
    var prefixFields = [];
    var prefBranch = Services.prefs.getBranch("");
    if(prefBranch.getPrefType("torbrowser.version") === prefBranch.PREF_STRING) {
      prefixFields.push("TorBrowser");
      prefixFields.push(prefBranch.getCharPref("torbrowser.version", ""));
    }
    else {
      var appInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
      prefixFields.push(appInfo.name);
      prefixFields.push(appInfo.version);
    }
    prefixFields.push(prefBranch.getCharPref("app.update.channel", ""))
    var joiner = (filename.charAt(0) === '.') ? "" : "-";
    filename = prefixFields.join("-").replace(/\s/g, "-") + joiner + filename;
  }
  if(options.filename.reflectsFiltering) {
    var filtering = false;
    Object.keys(options.prefilter.status).forEach(function(key) {
      if(options.prefilter.status[key] !== true) {
        filtering = true;
      }
    });
    Object.keys(options.prefilter.type).forEach(function(key) {
      if(options.prefilter.type[key] !== true) {
        filtering = true;
      }
    });
    log(typeof(options.filter.include) !== "undefined");
    if(options.filter.reMatchPrefName || options.filter.reMatchPrefValue) {
      filtering |= (typeof(options.filter.include) !== "undefined");
      filtering |= (typeof(options.filter.exclude) !== "undefined");
    }
    if(filtering) {
      filename += "-Filtered";
    }
  }
  // ToDo: Timestamp option?
  return(filename + "." + options.exportFormat);
}

function writeFile(file, str) {
  var result = false;
  try {
    // ToDo:
    // let encoder = new TextEncoder();
    // let array = encoder.encode(str);
    // OS.File.writeAtomic(file.path, array, {tmpPath: file.path + ".tmp"}).then(
    //   function() {
    //     // Success;
    //   },
    //   function(ex) {
    //     // Failure
    //   }
    // );
    //
    // ToDo:
    // Remove nsIConverterOutputStream
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1347888
    // Provide chrome JS helpers for reading UTF-8 as string and writing string as UTF-8 file
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1353285
    var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                             .createInstance(Components.interfaces.nsIFileOutputStream);
    foStream.init(file, 0x02 | 0x08 | 0x20, parseInt("0666", 8), 0);
    var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
                              .createInstance(Components.interfaces.nsIConverterOutputStream);
    converter.init(foStream, "UTF-8", 0, 0);
    converter.writeString(str);
    converter.close();
    result = true;
  }
  catch(e if (e.result === Components.results.NS_ERROR_FILE_IS_LOCKED)) {
    errorAlert("Write failed because file is locked:\n\n" + file.path);
  }
  catch(e if (e.result === Components.results.NS_ERROR_FILE_READ_ONLY)) {
    errorAlert("Write failed because file is readonly:\n\n" + file.path);
  }
  catch(e if (e.result === Components.results.NS_ERROR_FILE_ACCESS_DENIED)) {
    errorAlert("Write failed because access is denied:\n\n" + file.path);
  }
  catch(e) {
    errorAlert(e.toString(), true);
  }
  return(result);
}

function getNameValueRow(name, value, tableWidth) {
  var valueStr = value.toString();
  var pad = " ";
  var numPads = Math.max(2, tableWidth-valueStr.length-name.length-1);
  return(name + ":" + pad.repeat(numPads) + valueStr);
}

function caseInsensitiveSort(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  if( a == b) {
    return(0);
  }
  return(a < b ? -1 : 1);
}

function fatalError(msg, canAlert) {
  if(canAlert) {
    errorAlert(msg);
  }
  throw(gpe.prefix + msg);
}

function errorAlert(msg) {
  log(msg.replace("\n", " "));
  Services.prompt.alert(null, gpe.name, msg);
}

function log(msg) {
  if(typeof(console) !== "undefined") {
    console.log(gpe.prefix + msg);
  }
}
