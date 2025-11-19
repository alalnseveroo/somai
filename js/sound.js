// Utilitários de som
export class SoundEffects {
    constructor() {
        this.enabled = true;
        this.volume = -12;
    }

    /**
     * Habilita/desabilita sons
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Define volume
     */
    setVolume(volume) {
        this.volume = volume;
    }

    /**
     * Toca som de caixa registradora
     */
    async playCashRegister() {
        if (!this.enabled) return;
        if (typeof Tone === 'undefined' || !Tone) return;

        try {
            // Inicializa o AudioContext apenas quando necessário
            if (Tone.context.state === 'suspended') {
                await Tone.start();
            }

            const bell = new Tone.MetalSynth({
                frequency: 400,
                envelope: { attack: 0.001, decay: 0.14, release: 0.2 },
                harmonicity: 5.1,
                modulationIndex: 32,
                resonance: 4000,
                octaves: 1.5
            }).toDestination();
            bell.volume.value = this.volume;

            const drawer = new Tone.NoiseSynth({
                noise: { type: 'white' },
                envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 },
            }).toDestination();
            drawer.volume.value = this.volume - 13;
            
            const now = Tone.now();
            bell.triggerAttack(now);
            drawer.triggerAttack(now + 0.08);
        } catch (error) {
            console.warn('Não foi possível reproduzir o som:', error);
        }
    }

    /**
     * Toca som de notificação
     */
    async playNotification() {
        if (!this.enabled) return;
        if (typeof Tone === 'undefined' || !Tone) return;

        try {
            if (Tone.context.state === 'suspended') {
                await Tone.start();
            }

            const synth = new Tone.Synth({
                oscillator: { type: 'sine' },
                envelope: { attack: 0.05, decay: 0.1, sustain: 0.3, release: 0.5 }
            }).toDestination();
            synth.volume.value = this.volume;

            synth.triggerAttackRelease('C5', '0.2');
        } catch (error) {
            console.warn('Não foi possível reproduzir notificação:', error);
        }
    }

    /**
     * Toca som de erro
     */
    async playError() {
        if (!this.enabled) return;
        if (typeof Tone === 'undefined' || !Tone) return;

        try {
            if (Tone.context.state === 'suspended') {
                await Tone.start();
            }

            const synth = new Tone.Synth({
                oscillator: { type: 'sawtooth' },
                envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 }
            }).toDestination();
            synth.volume.value = this.volume;

            synth.triggerAttackRelease('G2', '0.15');
        } catch (error) {
            console.warn('Não foi possível reproduzir erro:', error);
        }
    }

    /**
     * Toca som de sucesso
     */
    async playSuccess() {
        if (!this.enabled) return;
        if (typeof Tone === 'undefined' || !Tone) return;

        try {
            if (Tone.context.state === 'suspended') {
                await Tone.start();
            }

            const synth = new Tone.Synth({
                oscillator: { type: 'triangle' },
                envelope: { attack: 0.02, decay: 0.1, sustain: 0.2, release: 0.3 }
            }).toDestination();
            synth.volume.value = this.volume;

            const now = Tone.now();
            synth.triggerAttackRelease('E4', '0.15', now);
            synth.triggerAttackRelease('G4', '0.15', now + 0.1);
        } catch (error) {
            console.warn('Não foi possível reproduzir sucesso:', error);
        }
    }
}
