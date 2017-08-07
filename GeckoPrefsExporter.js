// GeckoPrefsExporter: Exports pref data from Gecko apps using nsIPrefService
//
// This has to run in app/browser context in order to read prefs.  You may
// have to "Enable browser chrome and add-on debugging toolboxes" in the
// Developer Toolbox Options, and in Scratchpad select Browser in the
// Environment menu.  When you are finished running this you can change
// those settings back to what they were.
//

"use strict";

// Adjust these options to suit your needs
var options = {
  exportFormat:          "txt",            // "txt", "csv", or "json"
  appSpecificFilename:   true,             // Prepend app name & version to basename?
  basename:              "ExportedPrefs",  // Base portion of filename
  addToRecentDocs:       false,            // A file picker option
  performFileSave:       true,             // In case you only want to see stats
  showResultsDialog:     false,            // If you want a results dialog with stats
  txt: {
    separator:           " • ",            // Separator between fields
    appendStatsToOutput: false,            // If you want stats in output file
  },
  txtAndCsv: {
    outputPrefName:      true,             // Include pref name?
    outputPrefStatus:    true,             // Include pref status?
    outputPrefType:      true,             // Include pref type?
    outputPrefValue:     true,             // Include pref value?
    outputPrefDefValue:  true,             // Include pref default value?
    escVerticalChars:    true,             // Escape newlines, vertical tab, form feed?
    endOfLine:           "\r\n",           // Line terminator
    outputHeader:        true,             // Output header with field descriptions?
  },
  prefExtracting: {
    prefRoot:            "",               // Can be adjusted to export sub-branches
    caseSensitiveSort:   true,             // Determines pref output order
    logNonAsciiChars:    false,            // Log non-ASCII prefs to console?
    filter: {
      include:           undefined,        // Must match to be included.  Ex: /telemetry/
      exclude:           undefined,        // If matches will be excluded (overrides include)
      reMatchPrefName:   true,             // Apply RegExps to pref name
      reMatchPrefValue:  true,             // Apply RegExps to pref value
      debug:             false,            // In case of trouble with filtering
      affectsFilename:   true,             // Append -Filtered to basename when filtering
    },
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
  numTypeErrors       : 0,
  numUserValues       : 0,
  numDefValues        : 0,
  maxPrefNameLen      : 0,
  maxUserValueLen     : 0,
  maxDefValueLen      : 0,
  // After filtering
  incFilterMatches    : 0,
  excFilterMatches    : 0,
  numPrefsForExport   : 0,
};
var statsTableWidth = 27;

log(gpe.desc + " Started");
// Module checks for different environments
if(typeof(Components) === "undefined") {
  fatalError("Components is undefined.  Are you running in browser context?", false);
}
if(typeof(Components.utils) === "undefined") {
  fatalError("Components.utils is undefined.  Are you running in browser context?", false);
}
if(typeof(Services) === "undefined") {
  log("Services is undefined.  Importing...");
  Components.utils.import("resource://gre/modules/Services.jsm");
  if(typeof(Services) === "undefined") {
    fatalError("Can't import resource://gre/modules/Services.jsm", false);
  }
}
if(typeof(FileUtils) === "undefined") {
  log("FileUtils is undefined.  Importing...");
  Components.utils.import("resource://gre/modules/FileUtils.jsm");
  if(typeof(FileUtils) === "undefined") {
    fatalError("resource://gre/modules/FileUtils.jsm", true);
  }
}
// The heart of it
getPrefs(prefs, options.prefExtracting, stats);
var fileSaveResultMsg = "File save disabled by options";
if(options.performFileSave) {
  var output = getOutput(prefs, stats, options);
  var outputFilename = options.basename;
  if((options.prefExtracting.filter.include) || (options.prefExtracting.filter.exclude)) {
    if(options.prefExtracting.filter.affectsFilename) {
      outputFilename += "-Filtered";
    }
  }
  outputFilename += "." + options.exportFormat;
  if(options.appSpecificFilename) {
    outputFilename = getAppSpecificFilename(outputFilename);
  }
  var file;
  if(typeof(window) !== "undefined") {
    // File picker can be used
    Object.keys(stats).forEach(function(key) {
      log(getTabledNameValueStr(key, stats[key], statsTableWidth));
    });
    file = pickOutputFile("Save " + gpe.name + " Export File As", outputFilename, options.exportFormat, options.addToRecentDocs);
  }
  else {
    // File picker can't be used - ask to save file to the desktop
    file = Services.dirsvc.get("Desk", Components.interfaces.nsILocalFile);
    file.append(outputFilename);
    var text = "\nSave to " + file.path + "?\n\n";
    if(Services.prompt.confirm(null, gpe.name, text) !== true) {
      file = undefined;
    }
  }
  if(file) {
    if(writeFile(file, output)) {
      fileSaveResultMsg = "Export successful";
    }
    else {
      fileSaveResultMsg = "Export failed";
    }
  }
  else {
    fileSaveResultMsg = "Export cancelled";
  }
}
log(fileSaveResultMsg);
if(options.showResultsDialog) {
  var text = fileSaveResultMsg + "\n\n";
  Object.keys(stats).forEach(function(key) {
    text += key + ":  " + stats[key] + "\n";
  });
  Services.prompt.alert(null, gpe.name, text);
}
log("Finished");


// Functions
function getPrefs(prefs, extractOptions, stats) {
  var defBranch = Services.prefs.getDefaultBranch(extractOptions.prefRoot);
  var defPrefNames = defBranch.getChildList("");
  var userBranch = Services.prefs.getBranch(extractOptions.prefRoot);
  var prefNames = userBranch.getChildList("");
  if(extractOptions.caseSensitiveSort) {
    defPrefNames.sort();
    prefNames.sort();
  }
  else {
    defPrefNames.sort(caseInsensitiveSort);
    prefNames.sort(caseInsensitiveSort);
  }

  // Verify assumption that pref names and types are the same on both User and Default branches
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
  if(!extractOptions.filter.include) {
    stats.incFilterMatches = "N/A";
  }
  if(!extractOptions.filter.exclude) {
    stats.excFilterMatches = "N/A";
  }

  // Compile pref information.  The representation should be consistent with that
  // presented by about:config.  It should also include other information which may
  // be of interest.
  // https://dxr.mozilla.org/mozilla-release/source/toolkit/components/viewconfig/content/config.js
  prefNames.forEach(function(prefName) {
    var pref = {
      name:     "<ERROR>",
      status:   "<ERROR>",
      type:     "<ERROR>",
      value:    "<ERROR>",
      defValue: "<NODEFAULTVALUE>",
    };
    pref.name = prefName;
    if(pref.name.length > stats.maxPrefNameLen) {
      stats.maxPrefNameLen = pref.name.length;
    }
    stats.numPrefs++;
    if(userBranch.prefIsLocked(pref.name)) {
      pref.status = "locked";
      stats.numLockedPrefs++;
    }
    else if(userBranch.prefHasUserValue(pref.name)) {
      pref.status = "userset";
      stats.numUsersetPrefs++;
    }
    else {
      pref.status = "default";
      stats.numDefaultPrefs++;
    }
    switch(userBranch.getPrefType(pref.name)) {
      case userBranch.PREF_BOOL:
        pref.type = "boolean";
        stats.numBooleanPrefs++;
        pref.value = userBranch.getBoolPref(pref.name);
        stats.numUserValues++;
        try {
          pref.defValue = defBranch.getBoolPref(pref.name);
          stats.numDefValues++;
        }
        catch(e) {
          // Covered
        }
        break;
      case userBranch.PREF_INT:
        pref.type = "integer";
        stats.numIntegerPrefs++;
        pref.value = userBranch.getIntPref(pref.name);
        stats.numUserValues++;
        try {
          pref.defValue = defBranch.getIntPref(pref.name);
          stats.numDefValues++;
        }
        catch(e) {
          // Covered
        }
        break;
      case userBranch.PREF_STRING:
        pref.type = "string";
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
        var isNonAscii = false;
        var isNonExtAscii = false;
        for(var i=0; i<pref.value.length; i++) {
          if(pref.value.charCodeAt(i) > 127) {
            isNonAscii = true;
          }
          if(pref.value.charCodeAt(i) > 255) {
            isNonExtAscii = true;
          }
        }
        if(isNonAscii) {
          stats.numNonAsciiPrefs++;
          if(isNonExtAscii) {
            stats.numNonExtAsciiPrefs++;
          }
          if(extractOptions.logNonAsciiChars) {
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
          // Covered
        }
        break;
      case userBranch.PREF_INVALID:
        pref.type = "<PREF_INVALID>";
        pref.value = "<PREF_INVALID>";
        pref.defValue = "<PREF_INVALID>";
        stats.numTypeErrors++;
        break;
      default:
        pref.type = "<PREF_UNKNOWN>";
        pref.value = "<PREF_UNKNOWN>";
        pref.defValue = "<PREF_UNKNOWN>";
        stats.numTypeErrors++;
        break;
    }
    if(prefShouldBeIncluded(pref, extractOptions.filter, stats)) {
      prefs.push(pref);
      stats.numPrefsForExport++;
    }
  });
}

function prefShouldBeIncluded(pref, filter, stats) {
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
      if(filter.include(pref)) {
        included = true;
        stats.incFilterMatches++;
        if(filter.debug) {
          console.log(pref.name + " name matched include function");
        }
      }
    }
    else fatalError("Invalid include filter", true);
  }
  if(filter.exclude) {
    if(included) {
      if(filter.exclude instanceof RegExp){
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
        if(filter.exclude(pref)) {
          included = false;
          stats.excFilterMatches++;
          if(filter.debug) {
            console.log(pref.name + " name matched exclude function");
          }
        }
      }
      else fatalError("Invalid exclude filter", true);
    }
  }
  return(included);
}

function getOutput(prefs, stats, options) {
  var output = "";
  var header = "";
  if(options.exportFormat === "json") {
    output = JSON.stringify(prefs);
  }
  else if((options.exportFormat === "txt") || (options.exportFormat === "csv")){
    var separator = (options.exportFormat === "txt") ? options.txt.separator : ",";
    if(options.txtAndCsv.outputHeader) {
      var fields = [];
      if(options.txtAndCsv.outputPrefName) {
        fields.push("<PREFNAME>");
      }
      if(options.txtAndCsv.outputPrefStatus) {
        fields.push("<STATUS>");
      }
      if(options.txtAndCsv.outputPrefType) {
        fields.push("<TYPE>");
      }
      if(options.txtAndCsv.outputPrefValue) {
        fields.push("<VALUE>");
      }
      if(options.txtAndCsv.outputPrefDefValue) {
        fields.push("<DEFAULTVALUE>");
      }
      if(options.exportFormat === "csv") {
        fields.forEach(function(f, i) {
          fields[i] = csvEscape(f);
        });
      }
      output += fields.join(separator) + options.txtAndCsv.endOfLine;
    }
    prefs.forEach(function(pref, index) {
      var fields = [];
      if(options.txtAndCsv.outputPrefName) {
        fields.push(pref.name);
      }
      if(options.txtAndCsv.outputPrefStatus) {
        fields.push(pref.status);
      }
      if(options.txtAndCsv.outputPrefType) {
        fields.push(pref.type);
      }
      if(options.txtAndCsv.outputPrefValue) {
        if((typeof(pref.value) === "string") && options.txtAndCsv.escVerticalChars) {
          fields.push(escapeVerticalChars(pref.value));
        }
        else fields.push(pref.value);
      }
      if(options.txtAndCsv.outputPrefDefValue) {
        if((typeof(pref.defValue) === "string") && options.txtAndCsv.escVerticalChars) {
          fields.push(escapeVerticalChars(pref.defValue));
        }
        else fields.push(pref.defValue);
      }
      if(options.exportFormat === "csv") {
        fields.forEach(function(f, i) {
          fields[i] = csvEscape(f);
        });
      }
      output += fields.join(separator) + options.txtAndCsv.endOfLine;
    });
  }
  else {
    fatalError("Invalid exportFormat", true);
  }
  if((options.exportFormat === "txt") && options.txt.appendStatsToOutput) {
    output += "\n";
    Object.keys(stats).forEach(function(key) {
      output += getTabledNameValueStr(key, stats[key], statsTableWidth) + "\n";
    });
    output += "\n";
  }
  return(output);
}

function escapeVerticalChars(s) {
  // These cause a value to span multiple lines.  Which may or may not be desired for diffing.
  return(s.replace(/\r\n/g, "\\r\\n").replace(/\n/g, "\\n").replace(/\v/g, "\\v").replace(/\f/g, "\\f"));
}

function csvEscape(str) {
  return('"' + str.replace(/\\/g, "\\\\").replace(/\"/g, "\"").replace(/,/g, "\\,") + '"');
}

function getAppSpecificFilename(filename) {
  var appNameStr = "";
  var appVerStr = "";
  var prefBranch = Services.prefs.getBranch("");
  if(prefBranch.getPrefType("torbrowser.version") === prefBranch.PREF_STRING) {
    appNameStr = "TorBrowser";
    appVerStr = prefBranch.getCharPref("torbrowser.version", "");
  }
  else {
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
    appNameStr = appInfo.name.replace(" ", "-");
    appVerStr = appInfo.version;
  }
  if(appVerStr != "") {
    appVerStr += "-";
  }
  return(appNameStr + "-" + appVerStr + filename);
}

function pickOutputFile(title, defaultFilename, defaultExtension, addToRecentDocs) {
  var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
  fp.init(window, title, fp.modeSave);
  fp.addToRecentDocs = addToRecentDocs;
  fp.defaultString = defaultFilename;
  fp.defaultExtension = defaultExtension;
  switch(defaultExtension) {
    case "json":
      fp.appendFilter("JSON Files", "*.json");
      break;
    case "txt":
    case "text":
      fp.appendFilters(fp.filterText);
      break;
    case "csv":
      fp.appendFilter("CSV Files", "*.csv");
      break;
    default:
      break;
  }
  fp.appendFilters(fp.filterAll);
  if(fp.show() != fp.returnCancel) {
    return(fp.file);
  }
  return(undefined);
}

function writeFile(file, data) {
  // ToDo: Switch to OS.File?
  var result = false;
  try {
    var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                             .createInstance(Components.interfaces.nsIFileOutputStream);
    foStream.init(file, 0x02 | 0x08 | 0x20, parseInt("0666", 8), 0);
    var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
                              .createInstance(Components.interfaces.nsIConverterOutputStream);
    converter.init(foStream, "UTF-8", 0, 0);
    converter.writeString(data);
    converter.close();
    result = true;
  }
  catch(e if (e.result === Components.results.NS_ERROR_FILE_IS_LOCKED)) {
    errorAlert("Write failed because file is locked:\n" + file.path);
  }
  catch(e if (e.result === Components.results.NS_ERROR_FILE_READ_ONLY)) {
    errorAlert("Write failed because file is readonly:\n" + file.path);
  }
  catch(e if (e.result === Components.results.NS_ERROR_FILE_ACCESS_DENIED)) {
    errorAlert("Write failed because access is denied:\n" + file.path);
  }
  catch(e) {
    errorAlert(e.toString(), true);
  }
  return(result);
}

function getTabledNameValueStr(nameStr, value, tableWidth) {
  var valueStr = value.toString();
  var pad = " ";
  var numPads = Math.max(2, tableWidth-valueStr.length-nameStr.length-1);
  return(nameStr + ":" + pad.repeat(numPads) + valueStr);
}

function caseInsensitiveSort(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  if( a == b) {
    return 0;
  }
  return a < b ? -1 : 1;
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
