### GeckoPrefsExporter

GeckoPrefsExporter.js is a Javascript code snippet that exports [preferences](https://developer.mozilla.org/en-US/docs/Mozilla/Preferences) from Gecko-based applications such as Firefox, SeaMonkey, Thunderbird, TorBrowser, and others.  It can be run within those applications via their [Scratchpad](https://developer.mozilla.org/en-US/docs/Tools/Scratchpad).  Once prefs have been exported to a file, that file can be diffed against other export files, analyzed in other fashions, and/or kept for future reference.  For example, I like to compare an export from a new version to an export from the previous version.  That helps to understand what is changing, and identify the prefs that may need to be reviewed if not modified.

There are three output formats: "txt", "csv", and "json".  This is a few lines from a "txt" output that shows what is collected for each pref:

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

Every version checked in here *should* be functional.  If you run into any problems please let me know.

[Wiki](https://github.com/Theemim/GeckoPrefsExporter/wiki)

