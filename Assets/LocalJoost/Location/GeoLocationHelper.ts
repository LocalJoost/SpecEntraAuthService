require('LensStudio:RawLocationModule');
import { CancelToken, setTimeout } from "SpectaclesInteractionKit.lspkg/Utils/FunctionTimingUtils";
import { clearTimeout } from "SpectaclesInteractionKit.lspkg/Utils/FunctionTimingUtils";

export default class GeoLocationHelper {
    private geoLocationService: LocationService;
    private isActiveInternal: boolean = false;
    private timeoutId: CancelToken;

    constructor() {
        this.geoLocationService = GeoLocation.createLocationService();
    }

    public getCurrentPosition(onSuccess: (geoPosition: GeoPosition) => void, onError: (error: string) => void, onTimeOut: () => void, timeOutSeconds: number): void {
        if( global.deviceInfoSystem.isEditor() ) {
            this.getTestPosition1(onSuccess, onError, onTimeOut, 3);
            return;
        }
        
        this.startTimeOutTimer(timeOutSeconds, onTimeOut);
        this.geoLocationService.accuracy = GeoLocationAccuracy.Navigation;
        this.geoLocationService.getCurrentPosition((position) => {
            if (this.isActiveInternal) {
                this.clearTimeout();
                onSuccess(position);
            }
        }, (error) => {
            if (this.isActiveInternal) {
                this.clearTimeout
                onError(error);
            }
        }); 
    }

    public getTestPosition1(onSuccess: (geoPosition: GeoPosition) => void, onError: (error: string) => void, onTimeOut: () => void, timeOutSeconds: number): void {
        this.startTimeOutTimer(timeOutSeconds, () => {
            var pos = GeoPosition.create();
            pos.latitude = 52.182347;
            pos.longitude = 5.39790296;
            pos.altitude = 2;
            onSuccess(pos);
        });
    }

        public getTestPosition2(onSuccess: (geoPosition: GeoPosition) => void, onError: (error: string) => void, onTimeOut: () => void, timeOutSeconds: number): void {
        this.startTimeOutTimer(timeOutSeconds, () => {
            onTimeOut();
        });
    }

    private startTimeOutTimer(timeout: number, onTimeOut: () => void): void {
        this.isActiveInternal = true;
        this.timeoutId = setTimeout(() => {
            onTimeOut();
        }, timeout * 1000) as CancelToken;
    }
    
    private clearTimeout(): void {
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.isActiveInternal = false;
            this.timeoutId = null;
        }
    }
}