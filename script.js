const canvas = document.getElementById('colorWheel');
const ctx = canvas.getContext('2d');
const maxRadius = 400;
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const chromaRange = document.getElementById('chromaRange');
const chromaValueDisplay = document.getElementById('chromaValue');
const lightnessStepsRange = document.getElementById('lightnessStepsRange');
const lightnessStepsValueDisplay = document.getElementById('lightnessStepsValue');
const hueStepsRange = document.getElementById('hueStepsRange');
const hueStepsValueDisplay = document.getElementById('hueStepsValue');
const lightnessMinRange = document.getElementById('lightnessMinRange');
const lightnessMinValueDisplay = document.getElementById('lightnessMinValue');
const colorChipsContainer = document.getElementById('colorChipsContainer');
const clearChipsButton = document.getElementById('clearChipsButton');

// カラーチップをクリアする関数
clearChipsButton.addEventListener('click', () => {
    colorChipsContainer.innerHTML = '';  // カラーチップのコンテナをクリア
});

// 色相環を描く関数
function drawColorWheel(chroma, lightnessSteps, hueSteps, lightnessMin) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);  // キャンバスをクリア

    const stepSize = maxRadius / lightnessSteps;

    for (let i = 0; i < 360; i += (360 / hueSteps)) {
        const hue = Math.floor(i / (360 / hueSteps)) * (360 / hueSteps);

        const startAngle = ((i - 90) * Math.PI) / 180;
        const endAngle = ((i + (360 / hueSteps) - 90) * Math.PI) / 180;

        for (let step = 0; step < lightnessSteps; step++) {
            const innerRadius = step * stepSize;
            const outerRadius = (step + 1) * stepSize;

            const lightness = 100 - ((step / lightnessSteps) * (100 - lightnessMin));

            // OKLCHの色を生成
            const color = `oklch(${lightness}% ${chroma} ${hue}deg)`;

            ctx.fillStyle = color;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
            ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
            ctx.closePath();
            ctx.fill();
        }
    }
}

// 初期描画
drawColorWheel(chromaRange.value, lightnessStepsRange.value, hueStepsRange.value, lightnessMinRange.value);

// Chromaの値が変更された時のイベントリスナー
chromaRange.addEventListener('input', (event) => {
    const newChroma = event.target.value;
    chromaValueDisplay.textContent = newChroma;
    drawColorWheel(newChroma, lightnessStepsRange.value, hueStepsRange.value, lightnessMinRange.value);
});

// Lightness Stepsが変更された時のイベントリスナー
lightnessStepsRange.addEventListener('input', (event) => {
    const newLightnessSteps = event.target.value;
    lightnessStepsValueDisplay.textContent = newLightnessSteps;
    drawColorWheel(chromaRange.value, newLightnessSteps, hueStepsRange.value, lightnessMinRange.value);
});

// Hue Stepsが変更された時のイベントリスナー
hueStepsRange.addEventListener('input', (event) => {
    const newHueSteps = event.target.value;
    hueStepsValueDisplay.textContent = newHueSteps;
    drawColorWheel(chromaRange.value, lightnessStepsRange.value, newHueSteps, lightnessMinRange.value);
});

// Lightness Minが変更された時のイベントリスナー
lightnessMinRange.addEventListener('input', (event) => {
    const newLightnessMin = event.target.value;
    lightnessMinValueDisplay.textContent = newLightnessMin;
    drawColorWheel(chromaRange.value, lightnessStepsRange.value, hueStepsRange.value, newLightnessMin);
});

// カラーチップを追加する関数
function addColorChip(color) {
    const chip = document.createElement('div');
    chip.className = 'color-chip';
    chip.style.backgroundColor = color;

    // OKLCHの値をツールチップとして表示するために、title属性に色の値を設定
    chip.title = color;

    // 先頭にカラーチップを挿入
    if (colorChipsContainer.firstChild) {
        colorChipsContainer.insertBefore(chip, colorChipsContainer.firstChild);
    } else {
        colorChipsContainer.appendChild(chip);  // 最初のカラーチップはそのまま追加
    }
}

// キャンバス上のクリック位置から色を取得し、カラーチップとして追加
canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 中心からの距離を計算
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= maxRadius) {
        // クリックされた場所が色相環の内部の場合、角度を計算して色相を決定
        const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        const hueStepSize = 360 / hueStepsRange.value;
        const hue = Math.floor((angle + 360) % 360 / hueStepSize) * hueStepSize;  // 色相をステップ化

        // 距離に応じてライトネスを正確に計算 (外周の正確な計算)
        const stepSize = maxRadius / lightnessStepsRange.value;
        const step = Math.min(Math.floor(distance / stepSize), lightnessStepsRange.value - 1);  // ステップ数を範囲内に制限
        const lightness = 100 - (step / lightnessStepsRange.value) * (100 - lightnessMinRange.value);  // ステップごとのライトネス
        const chroma = chromaRange.value;  // 現在のクロマ値を取得

        // OKLCHの色を生成
        const color = `oklch(${lightness}% ${chroma} ${hue}deg)`;

        // カラーチップを追加
        addColorChip(color);  // 新しいカラーチップを追加
    }
});

// 色相環上でマウスが動いたときにツールチップを表示するための関数
canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 中心からの距離を計算
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= maxRadius) {
        // マウスが色相環の内部にある場合、色相とライトネスを計算
        const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        const hueStepSize = 360 / hueStepsRange.value;
        const hue = Math.floor((angle + 360) % 360 / hueStepSize) * hueStepSize;  // 色相をステップ化

        const stepSize = maxRadius / lightnessStepsRange.value;
        const step = Math.min(Math.floor(distance / stepSize), lightnessStepsRange.value - 1);  // ステップ数を範囲内に制限
        const lightness = 100 - (step / lightnessStepsRange.value) * (100 - lightnessMinRange.value);  // ステップごとのライトネス
        const chroma = chromaRange.value;  // 現在のクロマ値を取得

        // OKLCH色空間の値を生成
        const color = `oklch(${lightness}% ${chroma} ${hue}deg)`;

        // ツールチップを表示するために、キャンバスのtitle属性を更新
        canvas.title = color;
    } else {
        // 色相環の外側ではツールチップを非表示にする
        canvas.title = '';
    }
});