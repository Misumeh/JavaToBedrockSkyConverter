const mcpatcherPath = 'assets/minecraft/mcpatcher';
const optfinePath = 'assets/minecraft/optifine';
const fileInput = document.getElementById('file');
const fileLabel = document.getElementById('file-label');
const convertButton = document.getElementById('convert-button');
const skyPresets = document.getElementById('sky-presets');
const customGroup = document.getElementById('custom-group');
const skynameInput = document.getElementById('skyname');
const uploadCard = document.getElementById('upload-card');
const previewPanel = document.getElementById('preview-panel');
const previewImage = document.getElementById('preview-image');
const statusText = document.getElementById('status-text');
const consolePanel = document.getElementById('console-panel');
const consoleFeed = document.getElementById('console-feed');
const buttonLabel = document.querySelector('#convert-button .button-label');
const buttonSpinner = document.querySelector('#convert-button .button-spinner');

let currentZip = null;
let detectedFiles = [];
const defaultSky = 'starfield.png';

function resetFileState() {
    currentZip = null;
    detectedFiles = [];
    fileLabel.textContent = 'No file selected';
    skyPresets.innerHTML = '<option value="" disabled selected>Upload a ZIP to detect sky files</option><option value="custom">Custom filename</option>';
    skyPresets.value = '';
    customGroup.classList.add('hidden');
    previewPanel.classList.add('hidden');
    uploadCard.classList.remove('file-ready');
    convertButton.disabled = true;
    skynameInput.value = defaultSky;
    setStatus('Ready to convert');
}

function setStatus(message) {
    if (statusText) {
        statusText.textContent = message;
    }
}

function logEvent(message, type = 'info') {
    if (!consoleFeed || !consolePanel) return;
    consolePanel.classList.remove('hidden');
    const line = document.createElement('p');
    line.textContent = `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} – ${message}`;
    line.className = type;
    consoleFeed.prepend(line);
    while (consoleFeed.children.length > 8) {
        consoleFeed.removeChild(consoleFeed.lastChild);
    }
}

function setLoading(loading) {
    if (!buttonSpinner || !buttonLabel) return;
    if (loading) {
        buttonSpinner.classList.remove('hidden');
        buttonLabel.innerHTML = '<i class="fas fa-file-export"></i> Converting...';
        convertButton.disabled = true;
    } else {
        buttonSpinner.classList.add('hidden');
        buttonLabel.innerHTML = '<i class="fas fa-file-export"></i> Convert';
        convertButton.disabled = currentZip === null;
    }
}

function isImageFilename(name) {
    return /\.(png|jpg|jpeg|webp|gif|bmp|avif|svg)$/i.test(name);
}

function onSkySelectionChange() {
    const selectedValue = skyPresets.value;

    if (!selectedValue || selectedValue === 'custom') {
        customGroup.classList.remove('hidden');
        previewPanel.classList.add('hidden');
        skynameInput.value = defaultSky;
        setStatus('Enter a custom sky filename with a valid image extension.');
        logEvent('Custom sky filename mode selected.');
        convertButton.disabled = currentZip === null;
        return;
    }

    customGroup.classList.add('hidden');
    convertButton.disabled = false;
    const selectedEntry = detectedFiles.find((fileEntry) => fileEntry.path === selectedValue);
    if (selectedEntry) {
        skynameInput.value = selectedEntry.name;
        showPreview(selectedEntry);
        setStatus(`Selected ${selectedEntry.name}. Ready to convert.`);
        logEvent(`Selected sky file: ${selectedEntry.name}`);
    } else {
        previewPanel.classList.add('hidden');
    }
}

async function onFileChange() {
    const file = fileInput.files[0];
    if (!file) {
        resetFileState();
        return;
    }

    uploadCard.classList.add('file-ready');
    fileLabel.textContent = file.name;
    convertButton.disabled = true;
    customGroup.classList.add('hidden');
    previewPanel.classList.add('hidden');
    setStatus('Scanning ZIP for sky textures...');
    logEvent(`Upload selected: ${file.name}`);

    try {
        currentZip = await JSZip.loadAsync(file);
        detectSkyFiles(currentZip);
    } catch (error) {
        console.error(error);
        logEvent('Failed to read ZIP file.', 'error');
        setStatus('Failed to read ZIP. Upload a valid ZIP archive.');
        alert('Unable to read ZIP file. Please upload a valid ZIP.');
        resetFileState();
    }
}

function detectSkyFiles(zip) {
    detectedFiles = [];
    skyPresets.innerHTML = '<option value="" disabled selected>Choose detected sky file…</option>';

    const scanPaths = [`${mcpatcherPath}/sky/world0/`, `${optfinePath}/sky/world0/`];

    zip.forEach((relativePath, zipEntry) => {
        const normalizedPath = relativePath.replace(/\\/g, '/');
        scanPaths.forEach((basePath) => {
            if (normalizedPath.startsWith(basePath) && !zipEntry.dir) {
                const fileName = normalizedPath.substring(basePath.length);
                if (fileName && isImageFilename(fileName)) {
                    detectedFiles.push({ name: fileName, path: normalizedPath });
                }
            }
        });
    });

    if (detectedFiles.length === 0) {
        skyPresets.innerHTML = '<option value="custom">Custom filename</option>';
        skyPresets.value = 'custom';
        customGroup.classList.remove('hidden');
        previewPanel.classList.add('hidden');
        convertButton.disabled = false;
        setStatus('No valid sky image files found. Use Custom filename or upload another ZIP.');
        logEvent('No sky image files detected in the ZIP.', 'error');
        return;
    }

    const uniqueFiles = [];
    detectedFiles.forEach((entry) => {
        if (!uniqueFiles.some((existing) => existing.name === entry.name)) {
            uniqueFiles.push(entry);
        }
    });

    uniqueFiles.forEach((fileEntry) => {
        const option = document.createElement('option');
        option.value = fileEntry.path;
        option.textContent = fileEntry.name;
        skyPresets.appendChild(option);
    });

    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Custom filename';
    skyPresets.appendChild(customOption);

    skyPresets.value = uniqueFiles[0].path;
    skynameInput.value = uniqueFiles[0].name;
    convertButton.disabled = false;
    setStatus(`Detected ${uniqueFiles.length} sky image file(s). Select one to preview.`);
    logEvent(`Detected ${uniqueFiles.length} sky image file(s).`);
    showPreview(uniqueFiles[0]);
}

async function showPreview(fileEntry) {
    if (!currentZip || !fileEntry) {
        previewPanel.classList.add('hidden');
        return;
    }

    const zipFile = currentZip.file(fileEntry.path);
    if (!zipFile) {
        previewPanel.classList.add('hidden');
        return;
    }

    try {
        const blob = await zipFile.async('blob');
        const url = URL.createObjectURL(blob);
        previewImage.src = url;
        previewImage.alt = `Preview of ${fileEntry.name}`;
        previewPanel.classList.remove('hidden');
        previewImage.onload = () => URL.revokeObjectURL(url);
    } catch (error) {
        console.error(error);
        previewPanel.classList.add('hidden');
    }
}

async function convert() {
    const inputFile = fileInput.files[0];
    if (!inputFile) {
        return null;
    }

    const selectedValue = skyPresets.value;
    const skyname = selectedValue === 'custom'
        ? skynameInput.value.trim() || defaultSky
        : skynameInput.value.trim();

    if (!isImageFilename(skyname)) {
        setStatus('Sky file must be a PNG or valid image file.');
        logEvent(`Invalid sky filename: ${skyname}`, 'error');
        alert('Sky file must be a PNG or valid image file.');
        return null;
    }

    try {
        setLoading(true);
        setStatus('Converting sky texture...');
        logEvent(`Starting conversion for ${skyname}`);

        const filename = inputFile.name.replace(/\.[^.]+$/, '');
        const zip = currentZip || await JSZip.loadAsync(inputFile);
        const sky = detectVersion(zip, skyname);

        if (!sky) {
            setStatus(`Could not find ${skyname} inside the ZIP.`);
            logEvent(`Unable to find ${skyname} in ZIP.`, 'error');
            alert(`Unable to find ${skyname} inside the uploaded ZIP.`);
            return null;
        }

        const blob = await sky.async('blob');
        const imageUrl = URL.createObjectURL(blob);
        const slices = await sliceImage(imageUrl);
        URL.revokeObjectURL(imageUrl);

        await return_zip(slices, filename);
        setStatus('Converted! Download should begin shortly.');
        logEvent('Conversion complete.', 'info');
    } catch (error) {
        console.error(error);
        setStatus('Conversion failed. See console for details.');
        logEvent('Conversion failed.', 'error');
        alert('Conversion failed. Please check the ZIP file and try again.');
    } finally {
        setLoading(false);
    }
}

function detectVersion(zip, skyname) {
    if (skyname.includes('/')) {
        const directFile = zip.file(skyname);
        if (directFile) return directFile;
    }

    const directPath = `${mcpatcherPath}/sky/world0/${skyname}`;
    const directPathOpt = `${optfinePath}/sky/world0/${skyname}`;
    const skyFile = zip.file(directPath) || zip.file(directPathOpt);
    return skyFile || null;
}

function sliceImage(imageDataUrl) {
    const img = new Image();
    img.src = imageDataUrl;

    return new Promise((resolve) => {
        img.onload = () => {
            const imageWidth = img.width;
            const imageHeight = img.height;
            const sliceCountX = 3;
            const sliceCountY = 2;
            const sliceSize = Math.ceil(imageWidth / sliceCountX);
            const slices = [];

            for (let y = 0; y < sliceCountY; y++) {
                for (let x = 0; x < sliceCountX; x++) {
                    const canvas = document.createElement('canvas');
                    canvas.className = 'slice';
                    const ctx = canvas.getContext('2d');

                    const startX = x * sliceSize;
                    const startY = y * sliceSize;
                    const width = Math.min(sliceSize, imageWidth - startX);
                    const height = Math.min(sliceSize, imageHeight - startY);

                    canvas.width = sliceSize;
                    canvas.height = sliceSize;

                    if ((x === 0 && y === 0) || (x === 1 && y === 0)) {
                        ctx.translate(sliceSize, sliceSize);
                        ctx.rotate(Math.PI);
                    }

                    ctx.drawImage(img, startX, startY, width, height, 0, 0, width, height);
                    slices.push(canvas);
                }
            }

            resolve(slices);
        };

        img.onerror = (error) => {
            console.error('Error loading image:', error);
            resolve([]);
        };
    });
}

async function return_zip(slices, filename) {
    const newZip = new JSZip();
    const promises = slices.map(async (canvas, index) => {
        try {
            const dataUrl = canvas.toDataURL('image/png');
            let fileName = '';

            switch (index) {
                case 0:
                    fileName = 'cubemap_5.png';
                    break;
                case 1:
                    fileName = 'cubemap_4.png';
                    break;
                case 2:
                    fileName = 'cubemap_0.png';
                    newZip.file('pack_icon.png', dataUrl.split(',')[1], { base64: true });
                    break;
                case 3:
                    fileName = 'cubemap_1.png';
                    break;
                case 4:
                    fileName = 'cubemap_2.png';
                    break;
                case 5:
                    fileName = 'cubemap_3.png';
                    break;
            }

            if (fileName) {
                newZip.file(`textures/environment/overworld_cubemap/${fileName}`, dataUrl.split(',')[1], { base64: true });
            }
        } catch (error) {
            console.error(`Error processing slice ${index}:`, error);
        }
    });

    newZip.file('manifest.json', JSON.stringify(replaceTempValues(filename), null, 2));
    await Promise.all(promises);

    const exportZip = await newZip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(exportZip);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${filename}_mellow_bedrock_converted.mcpack`;
    anchor.click();
    URL.revokeObjectURL(url);
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx'.replace(/[x]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function replaceTempValues(filename) {
    return {
        format_version: 1,
        header: {
            name: filename,
            uuid: generateUUID(),
            version: [1, 0, 0],
            description: 'Sky Converted by Mellow',
            min_engine_version: [1, 2, 6],
        },
        modules: [
            {
                type: 'resources',
                uuid: generateUUID(),
                version: [1, 0, 0],
                description: 'Sky Converted by Mellow.',
            },
        ],
        metadata: {
            authors: ['Misumeh'],
        },
    };
}

fileInput.addEventListener('change', onFileChange);
skyPresets.addEventListener('change', onSkySelectionChange);
convertButton.addEventListener('click', convert);
resetFileState();