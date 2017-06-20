module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        ts: {
            default: {
                src: ["*.ts", "node_modules/dimensions/**/*.ts", "spec/**/*.ts"],
                outDir: 'build'
            },
            options: {
                lib: ['es2015'],
                strict: true,
                sourceMap: false,
            }
        },
        jasmine_node: {
            options: {
                forceExit: true,
                match: '.',
                matchall: false,
                extensions: 'js',
                specNameMatcher: 'spec'
            },
            all: []
        }
    });

    // Tasks    
    grunt.loadNpmTasks('grunt-jasmine-node');
    grunt.loadNpmTasks("grunt-ts");

    grunt.registerTask('default', ['ts', 'jasmine_node']);
};