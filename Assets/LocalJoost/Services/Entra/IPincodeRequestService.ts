export interface IPincodeRequestService {
    askForPinCode(requireConfirm: boolean): Promise<string>;
}

export function IPincodeRequestService() {}
