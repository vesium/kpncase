/**
 * Created by Omer on 18/02/2022.
 */

function bindableErrors(value) {
    if (!value) {
        value = [];
    }
    if (value && !Array.isArray(value)) {
        value = [value];
    }
    return value.map(function (item, index) {
        const clone = Object.assign({}, item);
        clone.Id = index;
        clone.id = index;
        if (clone.message) {
            return clone;
        }
        if (clone.body) {
            if (clone.body.message) {
                clone.message = clone.body.message;
                return clone;
            }
            const {pageErrors, fieldErrors} = clone.body;
            if (Array.isArray(pageErrors) && pageErrors.length > 0) {
                clone.message = pageErrors.filter(x => x.message).map(x => x.message).join("\r\n");
                return clone;
            } else if (fieldErrors) {
                const errorsArray = Object.keys(fieldErrors).reduce((result, fieldError) => {
                    result = [...result, ...fieldErrors[fieldError]];
                    return result;
                }, []);
                clone.message = errorsArray.filter(x => x.message).map(x => x.message).join("\r\n");
                return clone;
            }
            clone.message = JSON.stringify(clone.body);
            return clone;
        }
        clone.message = JSON.stringify(clone);
        return clone;
    });
}

function getErrorMessage(value) {
    const errors = bindableErrors(value);
    return errors.map(x => x.message).join("\r\n");
}

export {bindableErrors, getErrorMessage}