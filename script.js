const mcpatcher_path = "assets/minecraft/mcpatcher"
const optfine_path = "assets/minecraft/optifine"
const skyname_e = document.getElementById('skyname')
const notebox = document.getElementById('note-box')
notebox.classList.add('invis')

skyname_e.addEventListener("focusin", () => {
    notebox.classList.remove('invis')
});
skyname_e.addEventListener("focusout",() => {
    try{
        notebox.classList.add('invis')
    } catch (error) {
        console.error(error)
    }
});
async function convert() {
    const input_file = document.getElementById('file').files[0];
    const skyname = skyname_e.value
    if (input_file) {
        try {
            const filename = input_file.name
            const zip = await JSZip.loadAsync(input_file);
            const sky = detect_version(zip, skyname);
            if (sky != null) {
                sky.async('blob').then(function (blob) {
                    // Use the blob as needed, for example, display it as an image
                    const imageUrl = URL.createObjectURL(blob);
                    sliceImage(imageUrl).then((slices) => {
                        // Now you can use the slices array here
                        return_zip(slices, filename)
                        // Call the return_zip function or any other logic that involves slices
                    });
                });
            }
            else return null
        }
        catch (error) {
            console.error(error);
        }
    }
    else return null
}

function detect_version(zip, skyname) {
    if (zip.folder(mcpatcher_path)) {
        const sky = zip.file(mcpatcher_path + '/sky/world0/' + skyname)
        return sky
    }
    if (zip.folder(optfine_path)) {
        const sky = zip.file(optfine_path + '/sky/world0/' + skyname)
        return sky
    }
    else return null
}

function sliceImage(imageDataUrl) {
    const img = new Image();
    img.src = imageDataUrl;

    // Create a promise to resolve when all slices are loaded
    const slicesLoadedPromise = new Promise((resolve) => {
        let slices = [];

        img.onload = function () {
            const imageWidth = img.width;
            const imageHeight = img.height;
            const slicecount_x = 3;
            const slicecount_y = 2;
            const slicecount_total = 6;
            const slicesize = Math.ceil(imageWidth / slicecount_x);

            for (let i = 0; i < slicecount_y; i++) {
                for (let j = 0; j < slicecount_x; j++) {
                    const canvas = document.createElement('canvas');
                    canvas.classList = 'slice';
                    const ctx = canvas.getContext('2d');

                    // Calculate the starting position for each slice
                    const startX = j * slicesize;
                    const startY = i * slicesize;
                    const width = Math.min(slicesize, imageWidth - startX);
                    const height = Math.min(slicesize, imageHeight - startY);

                    canvas.width = slicesize;
                    canvas.height = slicesize;
                    if (((i + j) == 0) || ((j == 1) && (i == 0))) { // fixes rotation of the first two squares
                        ctx.translate(slicesize, slicesize); // fuck you ig
                        ctx.rotate(Math.PI);
                    }
                    // Draw the sliced portion onto the canvas
                    ctx.drawImage(img, startX, startY, width, height, 0, 0, width, height);

                    slices.push(canvas);
                }
            }

            // Resolve the promise with the slices array
            resolve(slices);
        };

        // Reject the promise if the image fails to load
        img.onerror = function (error) {
            console.error('Error loading image:', error);
            resolve([]);
        };
    });

    // Return the promise to be used by the caller
    return slicesLoadedPromise;
}

async function return_zip(slices, filename) {
    const new_zip = new JSZip();
    const promises = slices.map(async function (canvas, index) {
        try {
            const dataUrl = await canvas.toDataURL('image/png');
            let fileName = ''
            if (index == 0) {
                fileName = `cubemap_5.png`;
            }
            if (index == 1) {
                fileName = `cubemap_4.png`;
            }
            if (index == 2) {
                fileName = `cubemap_0.png`;
                new_zip.file(('pack_icon.png'), dataUrl.split(',')[1], { base64: true });
            }
            if (index == 3) {
                fileName = `cubemap_1.png`;
            }
            if (index == 4) {
                fileName = `cubemap_2.png`;
            }
            if (index == 5) {
                fileName = `cubemap_3.png`;
            }
            new_zip.file(('/textures/environment/overworld_cubemap/' + fileName), dataUrl.split(',')[1], { base64: true });
        } catch (error) {
            console.error(`Error processing slice ${index}:`, error);
        }
    });
    let mainifest = replaceTempValues(filename)
    new_zip.file('manifest.json', JSON.stringify(mainifest, null, 2));
    await Promise.all(promises);
    const export_zip = await new_zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(export_zip);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_bedrock_sky.mcpack`
    a.click();
    URL.revokeObjectURL(url);
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx'.replace(/[x]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function replaceTempValues(filename) {
    let mainifest = {
        "format_version": 1,
        "header": {
            "name": filename,
            "uuid": generateUUID(),
            "version": [
                1,
                0,
                0
            ],
            "description": "Sky Converted by XCRunnerS",
            "min_engine_version": [
                1,
                2,
                6
            ]
        },
        "modules": [
            {
                "type": "resources",
                "uuid": generateUUID(),
                "version": [
                    1,
                    0,
                    0
                ],
                "description": "Sky Converted by XCRunnerS."
            }
        ],
        "metadata": {
            "authors": [
                "XCRunnerS"
            ]
        }
    }
    return mainifest
}