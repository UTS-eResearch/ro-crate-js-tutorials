const fs = require('fs-extra');
const path = require('path')
const {ROCrate} = require('ro-crate');
const {Checker} = require('ro-crate');
const Preview = require("ro-crate-html-js").Preview;
const HtmlFile = require("ro-crate-html-js").HtmlFile;

// Make a new empty crate
const crate = new ROCrate();


async function main() {
    console.log("Empty Crate", JSON.stringify(crate.getJson(), null, 2));

    /*

    Empty Crate {
    "@context": [
        "https://w3id.org/ro/crate/1.1/context",
        {
        "@vocab": "http://schema.org/"
        }
    ],
    "@graph": [
        {
        "@type": "Dataset",
        "@id": "./"
        },
        {
        "@type": "CreativeWork",
        "@id": "ro-crate-metadata.json",
        "identifier": "ro-crate-metadata.json",
        "about": {
            "@id": "./"
        }
        }
    ]
    }
    */

    // Try to get the root item (commented out cos this creates an error)
    //console.log(crate.getItem("./"));

    /*
    /Users/pt/working/ro-crate-js/lib/rocrate.js:111
        return this._item_by_id[id];
                                ^

    TypeError: Cannot read property './' of undefined

    */

    // Error was becuase we have not built and index of items in the crate

    crate.index();
    const rootDataset = crate.getItem("./");
    console.log(rootDataset);

    /*

    { '@type': 'Dataset', '@id': './' }

    */


    // Check this crate
    var checker = new Checker(crate);

    console.log(await checker.validate());

    /*
    This is not a valid RO-Crate
    ✔️   Has @context: Has a context named "RO-Crate JSON-LD Context", version 1.1.1
    ✔️   Has root Dataset: There is a JSON-LD item with @type of Dataset (http://schema.org/dataset)
    ✔️   Root dataset has appropriate @id: The root dataset @id ends in "/"
    ❌   Has name: The root Dataset has a name (http://schema.org/name)
    ❌   Has description: The root Dataset has a description (http://schema.org/description)
    ❌   Has a license : The root Dataset has a License of type CreativeWork with a description
    ❌   Has a datePublished : The root Dataset has a datePublished with ONE value which is an  ISO 8601 format  precision of at least a day
    */

    // Crate needs more things

    // A name
    rootDataset.name = "Tutorial Crate";

    // A description
    rootDataset.description = "This is an example crate for educational purposes."

    // A license
    const license =    {
        "@id": "https://creativecommons.org/licenses/by/4.0/",
        "@type": "CreativeWork",
        "description": "Attribution 4.0 International (CC BY 4.0)\nYou are free to:\nShare — copy and redistribute the material in any medium or format\nAdapt — remix, transform, and build upon the material\nfor any purpose, even commercially.\n This license is acceptable for Free Cultural Works.\nThe licensor cannot revoke these freedoms as long as you follow the license terms.\nUnder the following terms:\nAttribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.\nNo additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.",
        "name": "CC BY 4.0"
      }

    // Add the license to the root dataset as a reference
    rootDataset.license = {"@id": license["@id"]}
    
    // But the license is not in the crate yet
    console.log("License", crate.getItem(rootDataset.license["@id"]))
    /*
    License undefined
    */


    // Add the license to the crate
    crate.addItem(license);
    console.log("License", crate.getItem(rootDataset.license["@id"]))


    /*
    License {
        '@id': 'https://creativecommons.org/licenses/by/4.0/',
        "@type": "CreativeWork",
        description: 'Attribution 4.0 International (CC BY 4.0)\n' +
            'You are free to:\n' +
            'Share — copy and redistribute the material in any medium or format\n' +
            'Adapt — remix, transform, and build upon the material\n' +
            'for any purpose, even commercially.\n' +
            ' This license is acceptable for Free Cultural Works.\n' +
            'The licensor cannot revoke these freedoms as long as you follow the license terms.\n' +
            'Under the following terms:\n' +
            'Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.\n' +
            'No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.',
        name: 'CC BY 4.0'
        }
   */

    const today = new Date().toISOString().split('T')[0]
    rootDataset.datePublished = today;


    console.log(await checker.validate());

    // We can make a new crate by feeding the JSON_LD from this one to a new one
    // You can use this idiom to make a crate from an RO-Crate-metadata.jsonld file.

    const newCrate = new ROCrate(crate.getJson());
    newCrate.index();
    console.log("New crate name:", newCrate.getRootDataset().name);
    /*
    New crate name: Tutorial Crate
    */
    
    // ADD SOME CONTENT AND WRITE OUT THE CRATE

    // Make a directory
    const crateDir = "tute-crate"
    if (await fs.exists(crateDir)){
        await fs.remove(crateDir);
    }   
    await fs.mkdirp(crateDir);


    // Write todays date into a file
    const dateFile = "date.txt";
    const dataPath = path.join(crateDir, dateFile)
    await fs.writeFile(dataPath, today);

    // Make a file item for the date file
    const fileItem = {
        "@id": dateFile,
        "@type": "File",
        "name": "Crating date",
        "description": "The date on the day this RO-Crate was made",
        "encodingFormat": "text/plain"
    }

    crate.addItem(fileItem);
    rootDataset.hasPart = [fileItem]; //Note this is an array value
    const metadataPath = path.join(crateDir, crate.defaults.roCrateMetadataID);

    // Write pretty-printed JSONLD into the directory
    console.log("writing", metadataPath)
    await fs.writeFile(metadataPath, JSON.stringify(crate.getJson(), null, 2));

    // Generate an RO-crate-preview
    const preview = await new Preview(crate);
    const f = new HtmlFile(preview); 

    fs.writeFileSync(path.join(crateDir, crate.defaults.roCratePreviewFileName),
                      await f.render());


    
}

main();
