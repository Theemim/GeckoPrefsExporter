### GeckoPrefsExporter

GeckoPrefsExporter.js is a Javascript snippet that exports preferences (application settings) from Gecko-based programs such as Firefox, SeaMonkey, Thunderbird, Palemoon, and others.  It can be executed in these applications via their [Scratchpad](https://developer.mozilla.org/en-US/docs/Tools/Scratchpad).  You may find this useful when:

* The about:config interface doesn't suffice
* You want to see both the user values and default values for prefs
* You want pref data in a file so that you can diff it against another file, perform other analysis, and/or keep it for future reference.  For example, comparing the prefs in a new release to the prefs in the previous release.
* You want to compare snapshots from a live system.  For example, comparing prefs before and after an update or other operation that may create new prefs and/or change existing ones.

GPE provides several export formats (txt, csv, js, json), filtering, and other options which can optimize output for different tasks and work flows.  Here are a few lines from a "txt" export:

```
<PREFNAME> • <STATUS> • <TYPE> • <VALUE> • <DEFAULTVALUE>
browser.feeds.showFirstRunUI • userset • boolean • false • <NODEFAULTVALUE>
browser.fixup.alternate.enabled • locked • boolean • false • false
browser.fixup.alternate.prefix • default • string • www. • www.
browser.fixup.alternate.suffix • default • string • .com • .com
browser.fixup.dns_first_for_single_words • locked • boolean • false • false
browser.fixup.domainwhitelist.localhost • default • boolean • true • true
browser.fixup.hide_user_pass • default • boolean • true • true
```
It also outputs stats which may be of interest:
```
numPrefs:              3068
numUsersetPrefs:         96
numDefaultPrefs:       2972
numLockedPrefs:           0
numBooleanPrefs:       1462
numIntegerPrefs:        798
numStringPrefs:         808
numLocalizedPrefs:       27
numNonAsciiPrefs:         2
numNonExtAsciiPrefs:      2
numHighCodePtPrefs:       0
numInvalidTypes:          0
numUnknownTypes:          0
numUserValues:         3068
numDefValues:          2995
maxPrefNameLen:          73
maxUserValueLen:       2761
maxDefValueLen:        2761
numIncByPrefilter:     3068
numExcByPrefilter:        0
incFilterMatches:       N/A
excFilterMatches:       N/A
numPrefsForExport:     3068
```

I'm not worrying about releases or versioning at this point.  Every version checked in here should be functional and I would recommend that you use the latest.  If you run into any problems please let me know.

[Wiki](https://github.com/Theemim/GeckoPrefsExporter/wiki)

