class Utils {
    static ArrayIncludes(array: any[], value: any): boolean {
        let includes = false;
        for (let i = 0; i < array.length; i++) {
            if (array[i] === value) {
                includes = true;
                break;
            }
        }

        return includes;
    }
}

export default Utils;