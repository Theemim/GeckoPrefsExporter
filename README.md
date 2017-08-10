### GeckoPrefsExporter

GeckoPrefsExporter.js is a Javascript code snippet that exports [preferences](https://developer.mozilla.org/en-US/docs/Mozilla/Preferences) (what you see in about:config) from Gecko-based applications such as Firefox, SeaMonkey, Thunderbird, Palemoon, and others.  It can be run within these applications via their [Scratchpad](https://developer.mozilla.org/en-US/docs/Tools/Scratchpad).  You may find this useful when:

* The about:config Search feature doesn't suffice
* You want to see default values that about:config doesn't display
* You want pref data in a file so that you can diff it against another file, perform other analysis, and/or keep it for future reference.  I like to compare an export from a new version to an export from the previous version.  That helps me to understand what is changing and which prefs need to be studied if not modified.
* You want to work with snapshots from a live system

There are three output formats: "txt", "csv", and "json".  This is a few lines from a "txt" output:

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

There is an include/exclude filter to control which prefs will be exported.  There are a number of options to control what information is included in the exports.  Plus some stats are collected.  This is from a Firefox 57 Nightly I was testing:

```
[GPE] numPrefs:              3172
[GPE] numUsersetPrefs:        122
[GPE] numDefaultPrefs:       3050
[GPE] numLockedPrefs:           0
[GPE] numBooleanPrefs:       1528
[GPE] numIntegerPrefs:        826
[GPE] numStringPrefs:         818
[GPE] numLocalizedPrefs:       27
[GPE] numNonAsciiPrefs:         2
[GPE] numNonExtAsciiPrefs:      2
[GPE] numTypeErrors:            0
[GPE] numUserValues:         3172
[GPE] numDefValues:          3080
[GPE] maxPrefNameLen:          73
[GPE] maxUserValueLen:       2761
[GPE] maxDefValueLen:        2761
[GPE] incFilterMatches:       N/A
[GPE] excFilterMatches:       N/A
[GPE] numPrefsForExport:     3172
```

I'm not worrying about releases or versioning at this point.  Every version checked in here should be functional and you should use the latest.  If you run into any problems please let me know.

[Wiki](https://github.com/Theemim/GeckoPrefsExporter/wiki)

