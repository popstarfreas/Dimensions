class StringUtils {
    public static format(raw: string, ...args: (string | number)[]): string {
        return raw.replace(/{(\d+)}/g, function(match, number) { 
        return typeof args[number] != 'undefined'
            ? args[number].toString()
            : match
        ;
        });
    }
}

export default StringUtils;