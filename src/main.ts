import './style.css'
import { BarcodeScanner } from './scanner'
import { registerServiceWorker } from './sw'
import { isValidUrl, formatErrorMessage } from './utils'
import { logger } from './logger'
import { benchmarkRunner } from './benchmark'

interface AppElements {
  openCameraBtn: HTMLButtonElement
  uploadBtn: HTMLButtonElement
  imageUpload: HTMLInputElement
  dropZone: HTMLDivElement
  stopScanBtn: HTMLButtonElement
  scanAgainBtn: HTMLButtonElement
  landingPage: HTMLDivElement
  scannerPage: HTMLDivElement
  resultPage: HTMLDivElement
  errorMessage: HTMLDivElement
  providerSelect: HTMLSelectElement
  providerDescription: HTMLSpanElement
  scannerProviderBadge: HTMLDivElement
  resultProviderBadge: HTMLDivElement
  scanTiming: HTMLDivElement
  decodeTiming: HTMLDivElement
  benchmarkBtn: HTMLButtonElement
  benchmarkUpload: HTMLInputElement
}

class BarcodeApp {
  private scanner: BarcodeScanner
  private elements: AppElements

  constructor() {
    logger.info('App', 'Initializing BarcodeApp')
    logger.group('App', 'Constructor')

    try {
      this.elements = this.getElements()
      logger.debug('App', 'DOM elements retrieved successfully')

      this.scanner = new BarcodeScanner()
      logger.debug('App', 'BarcodeScanner instance created')

      this.initializeEventListeners()
      logger.debug('App', 'Event listeners initialized')

      this.initializeProviderSelector()
      logger.debug('App', 'Provider selector initialized')

      this.showLandingPage()
      logger.info('App', 'Application initialized successfully')
    } catch (error) {
      logger.error('App', 'Failed to initialize application', error as Error)
      throw error
    } finally {
      logger.groupEnd()
    }
  }

  public cleanup(): void {
    logger.info('App', 'Cleaning up application')
    this.scanner.cleanup()
  }

  private async initializeProviderSelector(): Promise<void> {
    logger.info('App', 'Initializing provider selector')

    try {
      const providers = this.scanner.getAvailableProviders()

      // Clear existing options
      this.elements.providerSelect.innerHTML = ''

      // Add provider options
      providers.forEach(provider => {
        const option = document.createElement('option')
        option.value = provider.name
        option.textContent = provider.displayName
        this.elements.providerSelect.appendChild(option)
      })

      // Set current provider
      const currentProvider = this.scanner.getCurrentProvider()
      if (currentProvider) {
        this.elements.providerSelect.value = currentProvider.name
        this.updateProviderDescription(currentProvider.name)
      } else {
        // Initialize with default provider
        const defaultProvider = providers[0]
        if (defaultProvider) {
          this.elements.providerSelect.value = defaultProvider.name
          await this.scanner.setProvider(defaultProvider.name)
          this.updateProviderDescription(defaultProvider.name)
        }
      }

      logger.debug('App', 'Provider selector populated', {
        providerCount: providers.length,
        currentProvider: this.elements.providerSelect.value
      })
    } catch (error) {
      logger.error('App', 'Failed to initialize provider selector', error as Error)
    }
  }

  private updateProviderDescription(providerName: string): void {
    const providers = this.scanner.getAvailableProviders()
    const provider = providers.find(p => p.name === providerName)
    if (provider) {
      this.elements.providerDescription.textContent = provider.description
    }
  }

  private async handleProviderChange(event: Event): Promise<void> {
    const target = event.target as HTMLSelectElement
    const providerName = target.value

    logger.info('App', `Switching to provider: ${providerName}`)

    try {
      this.showProcessing('Switching scanner engine...')
      await this.scanner.setProvider(providerName)
      this.updateProviderDescription(providerName)
      this.updateProviderBadges()
      logger.info('App', `Successfully switched to provider: ${providerName}`)
    } catch (error) {
      logger.error('App', `Failed to switch provider: ${providerName}`, error as Error)
      this.handleError(error instanceof Error ? error : new Error('Failed to switch provider'))
    } finally {
      this.hideProcessing()
    }
  }

  private updateProviderBadges(): void {
    const currentProvider = this.scanner.getCurrentProvider()
    if (currentProvider) {
      const badgeText = `Engine: ${currentProvider.name}`
      this.elements.scannerProviderBadge.textContent = badgeText
      this.elements.resultProviderBadge.textContent = badgeText
    }
  }

  private getElements(): AppElements {
    const elements = {
      openCameraBtn: document.getElementById('open-camera-btn') as HTMLButtonElement,
      uploadBtn: document.getElementById('upload-btn') as HTMLButtonElement,
      imageUpload: document.getElementById('image-upload') as HTMLInputElement,
      dropZone: document.getElementById('drop-zone') as HTMLDivElement,
      stopScanBtn: document.getElementById('stop-scan-btn') as HTMLButtonElement,
      scanAgainBtn: document.getElementById('scan-again-btn') as HTMLButtonElement,
      landingPage: document.getElementById('landing-page') as HTMLDivElement,
      scannerPage: document.getElementById('scanner-page') as HTMLDivElement,
      resultPage: document.getElementById('result-page') as HTMLDivElement,
      errorMessage: document.getElementById('error-message') as HTMLDivElement,
      providerSelect: document.getElementById('provider-select') as HTMLSelectElement,
      providerDescription: document.getElementById('provider-description') as HTMLSpanElement,
      scannerProviderBadge: document.getElementById('scanner-provider-badge') as HTMLDivElement,
      resultProviderBadge: document.getElementById('result-provider-badge') as HTMLDivElement,
      scanTiming: document.getElementById('scan-timing') as HTMLDivElement,
      decodeTiming: document.getElementById('decode-timing') as HTMLDivElement,
      benchmarkBtn: document.getElementById('benchmark-btn') as HTMLButtonElement,
      benchmarkUpload: document.getElementById('benchmark-upload') as HTMLInputElement,
    }

    // Validate that all elements exist
    Object.entries(elements).forEach(([key, element]) => {
      if (!element) {
        throw new Error(`Required element not found: ${key}`)
      }
    })

    return elements
  }

  private initializeEventListeners(): void {
    logger.debug('App', 'Setting up event listeners')

    // Main button listeners
    this.elements.openCameraBtn.addEventListener('click', () => {
      logger.info('UI', 'Open camera button clicked')
      this.startScanning()
    })

    this.elements.uploadBtn.addEventListener('click', () => {
      logger.info('UI', 'Upload button clicked')
      this.triggerImageUpload()
    })

    this.elements.imageUpload.addEventListener('change', (e) => {
      logger.info('UI', 'File input changed')
      this.handleImageUpload(e)
    })

    this.elements.stopScanBtn.addEventListener('click', () => {
      logger.info('UI', 'Stop scan button clicked')
      this.stopScanning()
    })

    this.elements.scanAgainBtn.addEventListener('click', () => {
      logger.info('UI', 'Scan again button clicked')
      this.stopScanning()
    })

    this.elements.providerSelect.addEventListener('change', (e) => {
      logger.info('UI', 'Provider changed')
      this.handleProviderChange(e)
    })

    // Drag and drop event listeners
    this.elements.dropZone.addEventListener('click', () => {
      logger.info('UI', 'Drop zone clicked')
      this.triggerImageUpload()
    })

    this.elements.dropZone.addEventListener('dragover', (e) => {
      logger.debug('UI', 'File dragged over drop zone')
      this.handleDragOver(e)
    })

    this.elements.dropZone.addEventListener('dragleave', (e) => {
      logger.debug('UI', 'File dragged away from drop zone')
      this.handleDragLeave(e)
    })

    this.elements.dropZone.addEventListener('drop', (e) => {
      logger.info('UI', 'File dropped on drop zone')
      this.handleDrop(e)
    })

    // Scanner event listeners
    this.scanner.on('success', (result) => {
      logger.info('Scanner', 'Barcode scan successful', { text: result.text })
      this.handleScanSuccess(result)
    })

    this.scanner.on('error', (error) => {
      logger.error('Scanner', 'Scanner error occurred', error)
      this.handleError(error)
    })

    // Benchmark event listeners
    this.elements.benchmarkBtn.addEventListener('click', () => {
      logger.info('UI', 'Benchmark button clicked')
      this.elements.benchmarkUpload.click()
    })

    this.elements.benchmarkUpload.addEventListener('change', (e) => {
      logger.info('UI', 'Benchmark image selected')
      this.handleBenchmarkUpload(e)
    })

    logger.debug('App', 'All event listeners set up successfully')
  }

  private async startScanning(): Promise<void> {
    logger.info('App', 'Starting camera scanning')
    logger.time('Camera Start')

    try {
      this.hideError()
      this.showScannerPage()
      logger.debug('App', 'Requesting camera access...')

      await this.scanner.start()
      logger.timeEnd('Camera Start')
      logger.info('App', 'Camera scanning started successfully')
    } catch (error) {
      logger.timeEnd('Camera Start')
      logger.error('App', 'Failed to start camera scanning', error as Error)
      this.handleError(error instanceof Error ? error : new Error('Unknown error'))
      this.showLandingPage()
    }
  }

  private stopScanning(): void {
    logger.info('App', 'Stopping camera scanning')
    this.scanner.stop()
    this.showLandingPage()
    logger.debug('App', 'Camera scanning stopped and returned to landing page')
  }

  private handleScanSuccess(result: { text: string; imageData: string }): void {
    logger.info('App', 'Scan successful, displaying result', {
      textLength: result.text.length,
      isUrl: isValidUrl(result.text)
    })
    this.scanner.stop()
    this.showResultPage(result)
  }

  private handleError(error: Error): void {
    logger.error('App', 'Handling application error', error)
    const formattedMessage = this.getErrorMessage(error)
    logger.debug('App', 'Formatted error message for user', { message: formattedMessage })
    this.showError(formattedMessage)
  }

  private getErrorMessage(error: Error): string {
    return formatErrorMessage(error)
  }

  private showLandingPage(): void {
    logger.debug('UI', 'Showing landing page')
    this.hideAllPages()
    this.elements.landingPage.classList.remove('hidden')
  }

  private showScannerPage(): void {
    logger.debug('UI', 'Showing scanner page')
    this.hideAllPages()
    this.elements.scannerPage.classList.remove('hidden')
    this.updateProviderBadges()
  }

  private showResultPage(result: { text: string; imageData: string }): void {
    this.hideAllPages()

    const capturedImage = document.getElementById('captured-image') as HTMLImageElement
    const decodedText = document.getElementById('decoded-text') as HTMLDivElement

    capturedImage.src = result.imageData

    const isUrl = isValidUrl(result.text)
    if (isUrl) {
      decodedText.innerHTML = `<a href="${result.text}" target="_blank" rel="noopener noreferrer">${result.text}</a>`
    } else {
      decodedText.textContent = result.text
    }

    this.elements.resultPage.classList.remove('hidden')
  }

  private hideAllPages(): void {
    this.elements.landingPage.classList.add('hidden')
    this.elements.scannerPage.classList.add('hidden')
    this.elements.resultPage.classList.add('hidden')
  }

  private showError(message: string): void {
    this.elements.errorMessage.textContent = message
    this.elements.errorMessage.classList.remove('hidden')

    // Auto-hide error after 5 seconds
    setTimeout(() => this.hideError(), 5000)
  }

  private hideError(): void {
    this.elements.errorMessage.classList.add('hidden')
  }

  private triggerImageUpload(): void {
    this.elements.imageUpload.click()
  }

  private async handleImageUpload(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]

    if (file) {
      await this.processImageFile(file)
    }
  }

  private handleDragOver(event: DragEvent): void {
    event.preventDefault()
    this.elements.dropZone.classList.add('dragover')
  }

  private handleDragLeave(event: DragEvent): void {
    event.preventDefault()
    this.elements.dropZone.classList.remove('dragover')
  }

  private async handleDrop(event: DragEvent): Promise<void> {
    event.preventDefault()
    this.elements.dropZone.classList.remove('dragover')

    const files = event.dataTransfer?.files
    if (files && files.length > 0) {
      await this.processImageFile(files[0])
    }
  }

  private async processImageFile(file: File): Promise<void> {
    logger.info('Upload', 'Processing uploaded image file', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })
    logger.time('Image Processing')

    try {
      this.hideError()
      this.showProcessing('Analyzing image...')

      const result = await this.scanner.scanImageFile(file)
      logger.timeEnd('Image Processing')
      logger.info('Upload', 'Image processing successful')

      this.hideProcessing()
      this.handleScanSuccess(result)
    } catch (error) {
      logger.timeEnd('Image Processing')
      logger.error('Upload', 'Image processing failed', error as Error)

      this.hideProcessing()
      this.handleError(error instanceof Error ? error : new Error('Unknown error'))
    }
  }

  private showProcessing(message: string): void {
    // Create processing overlay
    const processing = document.createElement('div')
    processing.id = 'processing-overlay'
    processing.className = 'processing'
    processing.innerHTML = `
      <div class="spinner"></div>
      <p>${message}</p>
    `

    this.elements.landingPage.appendChild(processing)
  }

  private hideProcessing(): void {
    const processing = document.getElementById('processing-overlay')
    if (processing) {
      processing.remove()
    }
  }

  private async handleBenchmarkUpload(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]

    if (!file) {
      logger.warn('App', 'No file selected for benchmarking')
      return
    }

    logger.info('App', 'Running benchmark')
    logger.time('Benchmark')

    try {
      this.hideError()
      this.showProcessing('Running benchmark...')

      const report = await benchmarkRunner.benchmarkImageScan(file)
      const summaryMarkdown = benchmarkRunner.exportReport(report)

      logger.timeEnd('Benchmark')
      logger.info('App', 'Benchmark completed successfully', { summary: report.summary })

      // Display summary in result page (first lines)
      const summaryText = `Fastest: ${report.summary.fastestProvider || 'None'}\n` +
        `Avg Duration: ${report.summary.averageDuration.toFixed(2)}ms\n` +
        `Success Rate: ${(report.summary.successRate * 100).toFixed(1)}%`;

      const previewUrl = await new Promise<string>((resolve) => {
        const fr = new FileReader();
        fr.onload = (ev) => resolve(ev.target!.result as string);
        fr.readAsDataURL(file);
      });

      // Build HTML table of detailed results
      const tableHtml = [
        '<table class="benchmark-table">',
        '<thead><tr><th>Provider</th><th>Success</th><th>Duration (ms)</th><th>Decoded Text</th></tr></thead>',
        '<tbody>',
        ...report.results.map(r => `
          <tr>
            <td>${r.providerName}</td>
            <td>${r.success ? '✅' : '❌'}</td>
            <td>${r.duration.toFixed(2)}</td>
            <td>${r.result ? r.result : '-'}</td>
          </tr>
        `),
        '</tbody></table>'
      ].join('')

      // Render to UI
      this.hideAllPages()
      const decodedDiv = document.getElementById('decoded-text') as HTMLDivElement
      decodedDiv.innerHTML = `<pre>${summaryText}</pre>` + tableHtml
      const capturedImg = document.getElementById('captured-image') as HTMLImageElement
      capturedImg.src = previewUrl
      this.elements.resultPage.classList.remove('hidden')

      // Log full markdown to console for copy/export
      console.log('\nBenchmark Report:\n' + summaryMarkdown)
    } catch (error) {
      logger.timeEnd('Benchmark')
      logger.error('App', 'Benchmark failed', error as Error)
      this.handleError(error instanceof Error ? error : new Error('Benchmark failed'))
    } finally {
      this.hideProcessing()
      // reset input value for next selection
      this.elements.benchmarkUpload.value = ''
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    new BarcodeApp()
    registerServiceWorker()
  } catch (error) {
    console.error('Failed to initialize app:', error)
    document.getElementById('error-message')!.textContent =
      'Failed to initialize the application. Please refresh the page.'
    document.getElementById('error-message')!.classList.remove('hidden')
  }
})
