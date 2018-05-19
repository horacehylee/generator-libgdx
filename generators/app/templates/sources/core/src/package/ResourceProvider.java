package <%= projectPackage %>;

import javax.inject.Inject;
import javax.inject.Singleton;

@Singleton
public class ResourceProvider {
    @Inject
    public ResourceProvider() {
    }

    public String getLogo() {
        return "badlogic.jpg";
    }
}
