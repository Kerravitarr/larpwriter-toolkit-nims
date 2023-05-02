/* eslint-disable no-undef */
//const R = require('ramda');
// const EmptyBase = require('resources/emptyBase');
const EmptyBase = require('nims-resources/emptyBase');

describe('baseAPI', () => {
    let oldBase;

    beforeAll((done) => {
        DBMS.getDatabase().then((data) => {
            oldBase = data;
            DBMS.setDatabase({
                database: R.clone(EmptyBase.data)
            }).then(() => done()).catch((err) => {
                throw err;
            });
        }).catch((err) => {
            throw err;
        });
    });

    afterAll((done) => {
        DBMS.setDatabase({
            database: oldBase
        }).then(() => done()).catch((err) => {
            throw err;
        });
    });

    const funcs2 = ['getDatabase'];

    funcs2.forEach((func) => {
        it(func, (done) => {
            DBMS[func]().then((data) => {
                expect(data).not.toBeNull();
                done();
            }).catch((err) => {
                expect(err).toBeNull();
                done();
            });
        });
    });

    it('setDatabase(emptyBase) -> ok', (done) => {
        DBMS.setDatabase({
            database: R.clone(EmptyBase.data)
        }).then(() => {
            expect(123).not.toBeNull();
            done();
        }).catch((err) => {
            expect(err).toBeUndefined();
            done();
            // throw err;
        });
    });
    it('setDatabase({}) -> err', (done) => {
        DBMS.setDatabase({
            database: {}
        }).then(() => {
            // expect(123).not.toBeNull();
            // done();
        }).catch((err) => {
            expect(err).not.toBeNull();
            done();
            // throw err;
        });
    });

    //  'name', 'date', 'preGameDate', 'description'
    const setChecks = [

        {
            func: 'setMetaInfoString',
            args: { name: 'name', value: '123' },
            getter: 'getMetaInfo',
            getterArgs: {},
            getterCheck: (data, done) => {
                expect(data.name).toEqual('123');
                done();
            }
        },
        {
            func: 'setMetaInfoString',
            args: { name: 'description', value: '123' },
            getter: 'getMetaInfo',
            getterArgs: {},
            getterCheck: (data, done) => {
                expect(data.description).toEqual('123');
                done();
            }
        },
        {
            func: 'setMetaInfoDate',
            args: { name: 'date', value: '123' },
            getter: 'getMetaInfo',
            getterArgs: {},
            getterCheck: (data, done) => {
                expect(data.date).toEqual('123');
                done();
            }
        },
        {
            func: 'setMetaInfoDate',
            args: { name: 'preGameDate', value: '123' },
            getter: 'getMetaInfo',
            getterArgs: {},
            getterCheck: (data, done) => {
                expect(data.preGameDate).toEqual('123');
                done();
            }
        },
        {
            func: 'setMetaInfoString',
            args: { name: 654, value: '123' },
            errMessageId: 'errors-argument-is-not-a-string',
            errParameters: [654]
        },
        {
            func: 'setMetaInfoString',
            args: { name: '65465654', value: '123' },
            errMessageId: 'errors-unsupported-type-in-list',
            errParameters: ['65465654']
        },
        {
            func: 'setMetaInfoString',
            args: { name: 'description', value: 123 },
            errMessageId: 'errors-argument-is-not-a-string',
            errParameters: [123]
        },
    ];

    const checks = R.groupBy((el) => (el.errMessageId !== undefined ? 'errChecks' : 'okChecks'), setChecks);

    checks.okChecks = checks.okChecks.map((el) => {
        const args = JSON.stringify(el.args);
        el.name = `${el.func}(${args.substring(1, args.length - 1)}) -> ok`;
        return el;
    });

    checks.errChecks = checks.errChecks.map((el) => {
        const args = JSON.stringify(el.args);
        el.name = `${el.func}(${args.substring(1, args.length - 1)}) -> `;
        el.name += `${el.errMessageId}, ${JSON.stringify(el.errParameters)}`;
        return el;
    });

    checks.okChecks.forEach((check) => {
        it(check.name, (done) => {
            DBMS[check.func](check.args).then((res) => {
                DBMS[check.getter](check.getterArgs).then((data) => {
                    check.getterCheck(data, done);
                });
            });
        });
    });

    checks.errChecks.forEach((check) => {
        it(check.name, (done) => {
            DBMS[check.func](check.args).catch((err) => {
                expect(err).not.toBeUndefined();
                expect(err.messageId).toEqual(check.errMessageId);
                expect(err.parameters).toEqual(check.errParameters);
                done();
            });
        });
    });
});

//});
