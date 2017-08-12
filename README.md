### GeckoPrefsExporter

GeckoPrefsExporter.js is a Javascript snippet that exports preferences (what you see in about:config) from Gecko-based applications such as Firefox, SeaMonkey, Thunderbird, Palemoon, and others.  It can be executed in these applications via their [Scratchpad](https://developer.mozilla.org/en-US/docs/Tools/Scratchpad).  You may find this useful when:

* The about:config Search feature doesn't suffice
* You want to see default values that about:config doesn't display
* You want pref data in a file so that you can diff it against another file, perform other analysis, and/or keep it for future reference.  I like to compare an export from a new version to an export from the previous version.  That helps me to understand what is changing and which prefs need to be studied if not modified.
* You want to work with snapshots from a live system

GPE supports several output formats ("txt", "csv", "js", "json"), filtering, and other options which can optimize output for different tasks and work flows.  Here are a few lines from a default "txt" output:

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

It also outputs stats which may be of interest.  This is from Firefox 55:

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

I'm not worrying about releases or versioning at this point.  Every version checked in here should be functional and you should use the latest.  If you run into any problems please let me know.

[Wiki](https://github.com/Theemim/GeckoPrefsExporter/wiki)

